import { command, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { asc, count, eq, max } from 'drizzle-orm';
import * as v from 'valibot';
import { assertAdmin, entryId, isAdmin } from '#lib/server/admin.ts';
import { db } from '#lib/server/db/index.ts';
import { device, user, userProjectKey } from '#lib/server/db/schema.ts';

export const getUsers = query(async () => {
	const me = assertAdmin();
	const [users, keys, devices] = await Promise.all([
		db
			.select({ id: user.id, role: user.role, createdAt: user.createdAt })
			.from(user)
			.orderBy(asc(user.createdAt)),
		db
			.select({ userId: userProjectKey.userId, count: count() })
			.from(userProjectKey)
			.groupBy(userProjectKey.userId),
		db
			.select({ userId: device.userId, count: count(), lastSeenAt: max(device.lastSeenAt) })
			.from(device)
			.groupBy(device.userId)
	]);
	const projects = new Map(keys.map((row) => [row.userId, row.count]));
	const used = new Map(devices.map((row) => [row.userId, row]));
	return {
		users: users.map((row) => ({
			...row,
			/** Shown on the account's page, so its owner can tell which it is. */
			code: row.id.slice(0, 8),
			isAdmin: isAdmin(row),
			isMe: row.id === me.id,
			projects: projects.get(row.id) ?? 0,
			devices: used.get(row.id)?.count ?? 0,
			lastSeenAt: used.get(row.id)?.lastSeenAt ?? null
		}))
	};
});

/** Guards against admins locking themselves out. */
function otherUser(id: string) {
	if (id === assertAdmin().id) error(400, "You can't change your own account here");
	return id;
}

export const setRole = command(
	v.object({ id: entryId, role: v.picklist(['admin', 'user']) }),
	async ({ id, role }) => {
		await db
			.update(user)
			.set({ role })
			.where(eq(user.id, otherUser(id)));
		void getUsers().refresh();
	}
);

/** Their projects stay, as do the keys to them; the account only kept copies. */
export const deleteUser = command(entryId, async (id) => {
	await db.delete(user).where(eq(user.id, otherUser(id)));
	void getUsers().refresh();
});
