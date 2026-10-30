import type { Account, Device } from '#lib/server/accounts.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/** The account of the device the browser's token opens, see `hooks.server.ts`. */
			user?: Account;
			device?: Device;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
