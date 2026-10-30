import { getRequestEvent } from '$app/server';
import { error, type RequestEvent } from '@sveltejs/kit';
import * as v from 'valibot';
import { PART_ICONS } from '#lib/fasad/types.ts';
import { countAccounts, createAccount } from '#lib/server/accounts.ts';
import { hex, name } from '#lib/server/schemas.ts';

/** Admins are the first account made and those made admin in /admin/users. */
export function isAdmin(user: { role?: string | null } | undefined) {
	return user?.role === 'admin';
}

/**
 * Whoever opens the admin before there are any accounts sets the place up, e.g. adds its first
 * scenes: they get the first account, an admin.
 */
export async function openFirstAccount(event: RequestEvent) {
	if (event.locals.user || (await countAccounts())) return;
	await createAccount(event);
}

/** Guards the admin pages. */
export function requireAdmin({ locals }: RequestEvent) {
	if (!isAdmin(locals.user)) error(403, 'Forbidden');
	return locals.user!;
}

/**
 * Guards admin remote functions: they're called at the remote endpoint, which the admin pages'
 * guard in hooks.server.ts doesn't cover.
 */
export function assertAdmin() {
	const { user } = getRequestEvent().locals;
	if (!isAdmin(user)) error(403, 'Forbidden');
	return user!;
}

const optionalText = v.pipe(v.optional(v.string(), ''), v.trim(), v.maxLength(200));

const sortOrder = v.pipe(v.optional(v.number(), 0), v.integer());

/**
 * The entry a form edits; empty or omitted when adding one. A form instance made with `.for(key)`
 * posts its key as `id`, so the add dialogs use `''`.
 */
const id = v.pipe(
	v.optional(v.string(), ''),
	v.transform((id) => id || undefined)
);

/** Empty for an entry without one, e.g. a colour outside any group. */
const optionalId = v.pipe(
	v.optional(v.string(), ''),
	v.transform((id) => id || null)
);

/** A part layer's colour each; one per part of the scene the palette is edited for. */
export const paletteForm = v.object({
	id,
	name,
	groupId: optionalId,
	sortOrder,
	colors: v.pipe(v.array(v.object({ layer: v.string(), hex })), v.minLength(1))
});

/** A new scene also gets its photo, read with `imageFile`; it may be in no group. */
export const sceneForm = v.object({ id, name, groupId: optionalId, sortOrder });

export const newSceneForm = v.object({ ...sceneForm.entries, photo: v.optional(v.file()) });

export const groupForm = v.object({ id, name, sortOrder });

export const partForm = v.object({
	id,
	sceneId: v.string(),
	layer: name,
	name,
	hint: optionalText,
	icon: v.picklist(PART_ICONS),
	sortOrder
});

export const colorForm = v.object({
	id,
	name,
	code: v.pipe(v.optional(v.string(), ''), v.trim(), v.maxLength(60)),
	groupId: optionalId,
	hex,
	sortOrder
});

/** An uploaded catalogue file, see `importCatalog` and `importScenes`. */
export const importForm = v.object({
	file: v.optional(v.file()),
	mode: v.optional(v.picklist(['merge', 'replace']), 'merge')
});

/** Deleting an entry by its id. */
export const entryId = v.pipe(v.string(), v.nonEmpty());

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** An uploaded file's bytes, or undefined if none was chosen. */
export async function uploadedFile(value: unknown) {
	if (!(value instanceof File) || !value.size) return undefined;
	return Buffer.from(await value.arrayBuffer());
}

/** An uploaded image's bytes, or undefined if none was chosen or it isn't one. */
export async function imageFile(value: unknown) {
	if (!(value instanceof File) || !IMAGE_TYPES.includes(value.type)) return undefined;
	return uploadedFile(value);
}
