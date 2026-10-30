import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { NAV_COOKIE } from '#lib/components/app/nav.svelte.ts';
import { isKey } from '#lib/fasad/keys.ts';
import { getProjects } from '#lib/fasad/projects.remote.ts';
import * as accounts from '#lib/server/accounts.ts';
import { isAdmin } from '#lib/server/admin.ts';
import { allowMail, emailEnabled, hashEmail, maskEmail, sendMail } from '#lib/server/email.ts';

/** Who is looking: their account, if the browser has one yet, and how they left the studio's sidebar. */
export const getViewer = query(async () => {
	const { locals, cookies } = getRequestEvent();
	return {
		user: locals.user ? { id: locals.user.id } : null,
		isAdmin: isAdmin(locals.user),
		/** Whether accounts can have a recovery e-mail, see `email.ts`. */
		emailEnabled,
		emailHint: locals.user?.emailHint ?? null,
		// Read on the server so the page renders with the right sidebar width.
		navCollapsed: cookies.get(NAV_COOKIE) === 'collapsed'
	};
});

/** The viewer's device and account, which these functions need. */
function signedIn() {
	const { user, device } = getRequestEvent().locals;
	if (!user || !device) error(401, 'No account');
	return { user, device };
}

/** The devices signed in to the viewer's account, last used first. */
export const getDevices = query(async () => {
	const { user, device } = signedIn();
	const devices = await accounts.listDevices(user.id);
	return devices.map((entry) => ({ ...entry, isThis: entry.id === device.id }));
});

/** Signs another of the account's devices out, e.g. a lost phone. */
export const removeDevice = command(v.string(), async (id) => {
	const { user, device } = signedIn();
	await accounts.removeDevice(user.id, id, device.id);
	void getDevices().refresh();
});

/** A code for a link that adds another device to the account; it works once, for 15 minutes. */
export const createPairing = command(async () => accounts.createPairing(signedIn().user.id));

/**
 * Adds this browser to the account of a device link. One with an account of its own brings it
 * along: its projects and devices move over, and its token keeps working.
 */
export const pairDevice = command(v.custom<string>(isKey), async (code) => {
	const event = getRequestEvent();
	const account = await accounts.usePairing(code);
	if (!account) error(404, 'Not found');
	const { user } = event.locals;
	if (!user) await accounts.addDevice(event, account);
	else if (user.id !== account.id) await accounts.mergeAccount(user, account);
	event.locals.user = account;
	await Promise.all([getViewer().refresh(), getProjects().refresh()]);
});

const email = v.pipe(v.string(), v.trim(), v.maxLength(254), v.email());

/** Turned away without `EMAIL_PEPPER`, see `email.ts`. */
function assertEmailEnabled() {
	if (!emailEnabled) error(404, 'Not found');
}

/**
 * An address of the app for e-mails, with the code in its hash, which isn't sent to the server.
 * Not by `resolve`, which makes paths relative to the page, of which a remote call has none.
 */
const linkTo = (url: URL, path: '/account' | '/account/email', code: string) =>
	`${url.origin}${path}#${code}`;

/** Sends a link to the address that saves it as the viewer's recovery e-mail, see `confirmEmail`. */
export const requestRecoveryEmail = command(email, async (address) => {
	assertEmailEnabled();
	const { user } = signedIn();
	const { url } = getRequestEvent();
	const emailHash = hashEmail(address);
	if (!allowMail(`user:${user.id}`, 5) || !allowMail(`email:${emailHash}`, 3)) {
		error(429, 'Too many e-mails');
	}
	const code = await accounts.requestEmail(user.id, emailHash, maskEmail(address));
	await sendMail(
		address,
		'Confirm your recovery e-mail',
		`Open this link to save this address as the recovery e-mail of your Fasad account:

${linkTo(url, '/account/email', code)}

It works once, for an hour. If you didn't ask for this, you can ignore this e-mail.`
	);
});

/** Saves the e-mail of a link sent by `requestRecoveryEmail` as its account's recovery e-mail. */
export const confirmRecoveryEmail = command(v.custom<string>(isKey), async (code) => {
	assertEmailEnabled();
	const saved = await accounts.confirmEmail(code);
	if (!saved) error(404, 'Not found');
	// The viewer was read before the change, see `handleAccount`.
	const { locals } = getRequestEvent();
	if (locals.user?.id === saved.userId) locals.user = { ...locals.user, ...saved.email };
	void getViewer().refresh();
});

export const removeRecoveryEmail = command(async () => {
	const { user } = signedIn();
	await accounts.removeEmail(user.id);
	getRequestEvent().locals.user = { ...user, emailHash: null, emailHint: null };
	void getViewer().refresh();
});

/**
 * Sends a device link to the address, if it's an account's recovery e-mail. Answers the same
 * either way, and at once, so it doesn't tell which addresses have an account.
 */
export const recoverAccount = command(email, async (address) => {
	assertEmailEnabled();
	const event = getRequestEvent();
	if (!allowMail(`ip:${event.getClientAddress()}`, 10)) error(429, 'Too many e-mails');
	const emailHash = hashEmail(address);
	const send = async () => {
		const account = await accounts.findByEmail(emailHash);
		if (!account || !allowMail(`email:${emailHash}`, 3)) return;
		const { code } = await accounts.createPairing(account.id);
		await sendMail(
			address,
			'Sign in to your Fasad account',
			`Open this link to sign this browser in to your Fasad account:

${linkTo(event.url, '/account', code)}

It works once, for 15 minutes. Whoever opens it gets into your account, so don't pass it on. If you didn't ask for this, you can ignore this e-mail.`
		);
	};
	void send().catch((cause) => console.error('Sending a recovery e-mail', cause));
});
