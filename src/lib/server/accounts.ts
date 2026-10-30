import { createHash } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, gte, lt, ne, notInArray } from 'drizzle-orm';
import { newKey } from '#lib/fasad/keys.ts';
import { db } from '#lib/server/db/index.ts';
import {
	device,
	emailConfirmation,
	pairing,
	projectKey,
	user,
	userProjectKey
} from '#lib/server/db/schema.ts';

// Accounts need no sign-in: one is made on first use, with a device for the browser that made
// it. Each device is opened by a token of its own, which only its browser knows, in an HttpOnly
// cookie out of reach of the page's scripts; further devices are added with a link that works
// once, see `createPairing`.

export const ACCOUNT_COOKIE = 'account';

/** In seconds, as long as browsers allow, 400 days; renewed while the device is used, see `touch`. */
const COOKIE_AGE = 400 * 24 * 60 * 60;

export type Account = typeof user.$inferSelect;
export type Device = typeof device.$inferSelect;

const hash = (secret: string) => createHash('sha256').update(secret).digest('hex');

/** The device the token opens, if any, with its account. */
export async function findDevice(token: string) {
	const [row] = await db
		.select({ account: user, device })
		.from(device)
		.innerJoin(user, eq(device.userId, user.id))
		.where(eq(device.tokenHash, hash(token)));
	return row;
}

export async function countAccounts() {
	const [{ accounts }] = await db.select({ accounts: count() }).from(user);
	return accounts;
}

/** Sends the device's token with the browser's every request from now on. */
function setCookie({ cookies, url }: Pick<RequestEvent, 'cookies' | 'url'>, token: string) {
	cookies.set(ACCOUNT_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: COOKIE_AGE
	});
}

/** Signs the browser of the request in to the account, as a new device with a token of its own. */
export async function addDevice(event: RequestEvent, account: Account) {
	const token = newKey();
	const now = Date.now();
	const [row] = await db
		.insert(device)
		.values({
			userId: account.id,
			tokenHash: hash(token),
			name: deviceName(event.request.headers.get('user-agent')),
			createdAt: now,
			lastSeenAt: now
		})
		.returning();
	event.locals.user = account;
	event.locals.device = row;
	setCookie(event, token);
}

/** A new account for the browser of the request, signed in as its first device; the first account is an admin. */
export async function createAccount(event: RequestEvent) {
	const accounts = await countAccounts();
	const [account] = await db
		.insert(user)
		.values({ role: accounts ? 'user' : 'admin', createdAt: Date.now() })
		.returning();
	await addDevice(event, account);
	return account;
}

const HOUR = 60 * 60 * 1000;

/**
 * Notes that the device is in use, for its account's list, and renews its cookie; at most hourly,
 * to spare the database.
 */
export async function touch(event: RequestEvent, used: Device, token: string) {
	const now = Date.now();
	if (now - used.lastSeenAt < HOUR) return;
	await db.update(device).set({ lastSeenAt: now }).where(eq(device.id, used.id));
	setCookie(event, token);
}

/** The account's devices, last used first. */
export async function listDevices(userId: string) {
	return db
		.select({
			id: device.id,
			name: device.name,
			createdAt: device.createdAt,
			lastSeenAt: device.lastSeenAt
		})
		.from(device)
		.where(eq(device.userId, userId))
		.orderBy(desc(device.lastSeenAt));
}

/** Signs the device out, unless it's `current`: the account would be lost with its last device. */
export async function removeDevice(userId: string, deviceId: string, current: string) {
	await db
		.delete(device)
		.where(and(eq(device.id, deviceId), eq(device.userId, userId), ne(device.id, current)));
}

const PAIRING_TIME = 15 * 60 * 1000;

/** A code for a link that adds a device to the account, see `usePairing`. */
export async function createPairing(userId: string) {
	const code = newKey();
	const now = Date.now();
	await db.insert(pairing).values({ codeHash: hash(code), userId, expiresAt: now + PAIRING_TIME });
	return { code, expiresAt: now + PAIRING_TIME };
}

/** The account the code adds a device to; it works once, before it expires. */
export async function usePairing(code: string) {
	const [row] = await db
		.delete(pairing)
		.where(eq(pairing.codeHash, hash(code)))
		.returning();
	if (!row || row.expiresAt < Date.now()) return undefined;
	const [account] = await db.select().from(user).where(eq(user.id, row.userId));
	return account;
}

const CONFIRMATION_TIME = HOUR;

/**
 * A code for a link that saves the e-mail, given by its hash and hint (see `email.ts`), as the
 * account's recovery e-mail, see `confirmEmail`; sent to the address, so it proves it's theirs.
 */
export async function requestEmail(userId: string, emailHash: string, emailHint: string) {
	const code = newKey();
	await db.insert(emailConfirmation).values({
		codeHash: hash(code),
		userId,
		emailHash,
		emailHint,
		expiresAt: Date.now() + CONFIRMATION_TIME
	});
	return code;
}

/**
 * Saves the e-mail of the code as its account's recovery e-mail; it works once, before it
 * expires. An account that had the address before loses it: whoever confirmed it last owns it.
 * Returns the account and its e-mail, if saved.
 */
export async function confirmEmail(code: string) {
	const [row] = await db
		.delete(emailConfirmation)
		.where(eq(emailConfirmation.codeHash, hash(code)))
		.returning();
	if (!row || row.expiresAt < Date.now()) return undefined;
	const email = { emailHash: row.emailHash, emailHint: row.emailHint };
	await db.transaction(async (tx) => {
		await tx
			.update(user)
			.set({ emailHash: null, emailHint: null })
			.where(and(eq(user.emailHash, row.emailHash), ne(user.id, row.userId)));
		await tx.update(user).set(email).where(eq(user.id, row.userId));
	});
	return { userId: row.userId, email };
}

export async function removeEmail(userId: string) {
	await db.update(user).set({ emailHash: null, emailHint: null }).where(eq(user.id, userId));
}

/** The account whose recovery e-mail has the hash, if any. */
export async function findByEmail(emailHash: string) {
	const [account] = await db.select().from(user).where(eq(user.emailHash, emailHash));
	return account;
}

const UNUSED = 90 * 24 * HOUR;

/**
 * Deletes accounts left behind, e.g. made by opening a shared link once: those owning no project
 * that no device has used for 90 days. Admins stay. Projects shared with them stay with their
 * owners; expired device links go too.
 */
export async function pruneAccounts() {
	const now = Date.now();
	const owners = db
		.select({ id: userProjectKey.userId })
		.from(userProjectKey)
		.innerJoin(projectKey, eq(userProjectKey.keyId, projectKey.id))
		.where(eq(projectKey.role, 'owner'));
	const used = db
		.select({ id: device.userId })
		.from(device)
		.where(gte(device.lastSeenAt, now - UNUSED));
	await db.delete(pairing).where(lt(pairing.expiresAt, now));
	await db.delete(emailConfirmation).where(lt(emailConfirmation.expiresAt, now));
	await db
		.delete(user)
		.where(
			and(
				ne(user.role, 'admin'),
				lt(user.createdAt, now - UNUSED),
				notInArray(user.id, owners),
				notInArray(user.id, used)
			)
		);
}

/**
 * Moves the project keys, devices, admin role and recovery e-mail (unless `to` has one) of `from`
 * into `to`, then deletes `from`.
 */
export async function mergeAccount(from: Account, to: Account) {
	await db.transaction(async (tx) => {
		const keys = await tx
			.select({ keyId: userProjectKey.keyId })
			.from(userProjectKey)
			.where(eq(userProjectKey.userId, from.id));
		if (keys.length) {
			await tx
				.insert(userProjectKey)
				.values(keys.map(({ keyId }) => ({ userId: to.id, keyId })))
				.onConflictDoNothing();
		}
		await tx.update(device).set({ userId: to.id }).where(eq(device.userId, from.id));
		if (from.role === 'admin') {
			await tx.update(user).set({ role: 'admin' }).where(eq(user.id, to.id));
		}
		await tx.delete(user).where(eq(user.id, from.id));
		if (from.emailHash && !to.emailHash) {
			await tx
				.update(user)
				.set({ emailHash: from.emailHash, emailHint: from.emailHint })
				.where(eq(user.id, to.id));
		}
	});
}

const BROWSERS = [
	['Edg/', 'Edge'],
	['OPR/', 'Opera'],
	['Firefox/', 'Firefox'],
	['Chrome/', 'Chrome'],
	['Safari/', 'Safari']
];

const SYSTEMS = [
	['iPhone', 'iPhone'],
	['iPad', 'iPad'],
	['Android', 'Android'],
	['Mac OS', 'macOS'],
	['Windows', 'Windows'],
	['CrOS', 'ChromeOS'],
	['Linux', 'Linux']
];

/** Names a device after its browser and system, e.g. "Firefox on Linux", from its user agent. */
export function deviceName(userAgent: string | null) {
	const find = (names: string[][]) => names.find(([token]) => userAgent?.includes(token))?.[1];
	return `${find(BROWSERS) ?? 'Browser'} on ${find(SYSTEMS) ?? 'unknown system'}`;
}
