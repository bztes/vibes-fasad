import { building } from '$app/env';
import { type Handle, type ServerInit, sequence } from '@sveltejs/kit/hooks';
import { isKey } from '#lib/fasad/keys.ts';
import { ACCOUNT_COOKIE, findDevice, pruneAccounts, touch } from '#lib/server/accounts.ts';
import { openFirstAccount, requireAdmin } from '#lib/server/admin.ts';

const isAdminRoute = (route: string) =>
	route === '/admin' || route.startsWith('/admin/') || route.startsWith('/api/(admin)/');

/** Opens the device whose token the browser sent, and its account, see `accounts.ts`. */
const handleAccount: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(ACCOUNT_COOKIE);
	const found = isKey(token) ? await findDevice(token) : undefined;
	if (found) {
		event.locals.user = found.account;
		event.locals.device = found.device;
		await touch(event, found.device, token!);
	}
	return resolve(event);
};

// Guards the admin pages and the endpoints in the `src/routes/api/(admin)` group, by route rather
// than URL, as the group doesn't show in it. Remote functions are called at their own endpoint,
// so the admin ones check access themselves, see `assertAdmin`.
const handleAdmin: Handle = async ({ event, resolve }) => {
	if (isAdminRoute(event.route.id ?? '')) {
		await openFirstAccount(event);
		requireAdmin(event);
	}
	return resolve(event);
};

const DAY = 24 * 60 * 60 * 1000;

export const init: ServerInit = () => {
	if (building) return;
	const prune = () => pruneAccounts().catch((error) => console.error('Pruning accounts', error));
	void prune();
	setInterval(prune, DAY).unref();
};

export const handle: Handle = sequence(handleAccount, handleAdmin);
