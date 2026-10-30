import { command, getRequestEvent, query, requested } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { isKey } from '#lib/fasad/keys.ts';
import { allows, ROLES, type OpenProject, type Role } from '#lib/fasad/types.ts';
import { hex, name } from '#lib/server/schemas.ts';
import { createAccount } from '#lib/server/accounts.ts';
import * as projects from '#lib/server/projects.ts';

// Opening a project takes one of its keys, as far as its role allows: looking at it, changing it,
// or also handing out keys and deleting it. The viewer's account keeps every key it has used,
// from the projects it made and their links; it's made with the first, see `ensureAccount`.

const id = v.pipe(v.string(), v.uuid());
const key = v.custom<string>(isKey);
const access = v.object({ id, key });
const colors = v.record(v.string(), hex);
const sceneIds = v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(100));
const code = v.optional(v.pipe(v.string(), v.maxLength(80)));
const recipe = v.pipe(
	v.array(
		v.object({
			name: v.pipe(v.string(), v.maxLength(120)),
			hex,
			code,
			parts: v.pipe(v.number(), v.minValue(0))
		})
	),
	v.maxLength(50),
	v.transform((parts) => parts.filter((part) => part.parts > 0))
);

/** Whether the key allows `needed` on the project; the viewer's account keeps it. */
async function authorize(projectId: string, key: string, needed: Role) {
	const row = await projects.findKey(projectId, key);
	if (!row) error(403, 'Invalid key');
	const { user } = getRequestEvent().locals;
	if (user) await projects.claimKeys(user.id, [row.id]);
	if (!allows(row.role, needed)) error(403, `The key doesn't allow ${needed}`);
	return row;
}

/** The projects of the viewer's account, last edited first. */
export const getProjects = query(async () => {
	const { user } = getRequestEvent().locals;
	return user ? projects.heldProjects(user.id) : [];
});

/** The project with its colour library and palettes, as far as the key opens it. */
export const getProject = query(access, async ({ id, key }): Promise<OpenProject> => {
	const { role } = await authorize(id, key, 'view');
	const project = await projects.loadProject(id);
	if (!project) error(404, 'Not found');
	return { ...project, key, role };
});

/** Sends the projects the client shows back with the result of an edit, see `edit`. */
async function refreshProjects() {
	await Promise.all([
		requested(getProject, 4).refreshAll(),
		requested(getProjects, 4).refreshAll()
	]);
}

/**
 * Keeps the key in the viewer's account, made on first use, sending the project list back with
 * the result. Returns whether the account was just made, see `noticeAccount`.
 */
async function keep(keyId: string) {
	const event = getRequestEvent();
	const newAccount = !event.locals.user;
	const user = event.locals.user ?? (await createAccount(event));
	await projects.claimKeys(user.id, [keyId]);
	await getProjects().refresh();
	return newAccount;
}

/** Returns the new project's id and its owner's key, and whether an account was made for it. */
export const createProject = command(v.object({ name, sceneIds, colors }), async (data) => {
	const { id, key, keyId } = await projects.createProject(data);
	return { id, key, newAccount: await keep(keyId) };
});

/** Keeps a project opened by its link in the viewer's account; returns like `createProject`. */
export const keepProject = command(access, async ({ id, key }) => {
	const row = await projects.findKey(id, key);
	if (!row) error(403, 'Invalid key');
	return { newAccount: await keep(row.id) };
});

export const updateProject = command(
	v.object({
		id,
		key,
		name: v.optional(name),
		sceneIds: v.optional(sceneIds),
		colors: v.optional(colors),
		recipes: v.optional(v.record(v.string(), recipe))
	}),
	async ({ id, key, ...changes }) => {
		await authorize(id, key, 'edit');
		await projects.updateProject(id, changes);
		await refreshProjects();
	}
);

/** The copy is ours to edit, also of a project we can only look at; returns it like `createProject`. */
export const duplicateProject = command(v.object({ id, key, name }), async ({ id, key, name }) => {
	await authorize(id, key, 'view');
	const copy = await projects.duplicateProject(id, name);
	if (!copy) error(404, 'Not found');
	return { id: copy.id, key: copy.key, newAccount: await keep(copy.keyId) };
});

/** Deletes the project for everyone. */
export const deleteProject = command(access, async ({ id, key }) => {
	await authorize(id, key, 'owner');
	await projects.deleteProject(id);
	await refreshProjects();
});

/** Takes a project off the viewer's list; its keys still work. */
export const forgetProject = command(access, async ({ id }) => {
	const { user } = getRequestEvent().locals;
	if (user) await projects.forgetProject(user.id, id);
	await refreshProjects();
});

/** Adds a colour to the project's library, or replaces the one with `colorId`; returns its id. */
export const saveColor = command(
	v.object({ id, key, colorId: v.optional(id), name, hex, code, recipe }),
	async ({ id, key, colorId, ...color }) => {
		await authorize(id, key, 'edit');
		const saved = await projects.saveColor(id, colorId, color);
		await refreshProjects();
		return saved;
	}
);

export const deleteColor = command(
	v.object({ id, key, colorId: id }),
	async ({ id, key, colorId }) => {
		await authorize(id, key, 'edit');
		await projects.deleteColor(id, colorId);
		await refreshProjects();
	}
);

/** Adds a palette to the project, or replaces the one with `paletteId`; returns its id. */
export const savePalette = command(
	v.object({ id, key, paletteId: v.optional(id), name, colors }),
	async ({ id, key, paletteId, ...palette }) => {
		await authorize(id, key, 'edit');
		const saved = await projects.savePalette(id, paletteId, palette);
		await refreshProjects();
		return saved;
	}
);

export const deletePalette = command(
	v.object({ id, key, paletteId: id }),
	async ({ id, key, paletteId }) => {
		await authorize(id, key, 'edit');
		await projects.deletePalette(id, paletteId);
		await refreshProjects();
	}
);

/** The project's keys, for its owners to hand out and revoke. */
export const getKeys = query(access, async ({ id, key }) => {
	await authorize(id, key, 'owner');
	return projects.listKeys(id);
});

export const createKey = command(
	v.object({
		id,
		key,
		label: v.pipe(v.string(), v.trim(), v.maxLength(80)),
		role: v.picklist(ROLES)
	}),
	async ({ id, key, label, role }) => {
		await authorize(id, key, 'owner');
		const created = await projects.createKey(id, label, role);
		void getKeys({ id, key }).refresh();
		return created;
	}
);

/** Any owner may revoke any key but their own, so a project always keeps one. */
export const revokeKey = command(
	v.object({ id, key, keyId: v.string() }),
	async ({ id, key, keyId }) => {
		const row = await authorize(id, key, 'owner');
		if (row.id === keyId) error(400, "An owner can't revoke their own key");
		await projects.revokeKey(id, keyId);
		void getKeys({ id, key }).refresh();
	}
);
