import { DIR } from '$app/env/private';
import { command, form, query } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import * as v from 'valibot';
import { isOra } from '#lib/fasad/openraster.ts';
import {
	assertAdmin,
	entryId,
	groupForm,
	imageFile,
	importForm,
	newSceneForm,
	partForm,
	sceneForm,
	uploadedFile
} from '#lib/server/admin.ts';
import { db } from '#lib/server/db/index.ts';
import { scene, sceneGroup, scenePart } from '#lib/server/db/schema.ts';
import { deleteGroup, saveGroup } from '#lib/server/groups.ts';
import { readLayeredView } from '#lib/server/openraster.ts';
import { deleteMasks, deletePhotos, saveMask as writeMask, savePhoto } from '#lib/server/photos.ts';
import { importScenes as importScenesFile } from '#lib/server/scene-file.ts';
import { importMasks, loadGroups, loadScenes, validGroup } from '#lib/server/scenes.ts';

export const getScenes = query(async () => {
	assertAdmin();
	const [scenes, groups] = await Promise.all([loadScenes(), loadGroups()]);
	return { scenes, groups };
});

export const getScene = query(v.string(), async (id) => {
	assertAdmin();
	const [[found], groups] = await Promise.all([loadScenes(id), loadGroups()]);
	if (!found) error(404, 'Not found');
	return { scene: found, groups };
});

/** A photo, or an OpenRaster file with the photo and masks to go with it, see `importMasks`. */
async function readPhotoUpload(file: File | undefined) {
	const upload = await uploadedFile(file);
	const layered = upload && isOra(upload) ? await readLayeredView(upload) : undefined;
	return { photo: layered?.photo ?? (await imageFile(file)), masks: layered?.masks ?? [] };
}

/** Creates the scene with its photo, then opens it so parts can be added and painted. */
export const createScene = form(newSceneForm, async ({ name, groupId, sortOrder, photo: file }) => {
	assertAdmin();
	const { photo, masks } = await readPhotoUpload(file);
	if (!photo || !(await validGroup(groupId))) invalid('Invalid scene');
	const id = crypto.randomUUID();
	const size = await savePhoto(DIR, id, photo);
	if (!size) invalid('Invalid photo');
	await db.insert(scene).values({ id, name, groupId, sortOrder, ...size });
	await importMasks(id, masks);
	redirect(303, `/admin/scenes/${id}`);
});

export const saveScene = form(sceneForm, async ({ id, name, groupId, sortOrder }) => {
	assertAdmin();
	if (!id || !(await validGroup(groupId))) invalid('Invalid scene');
	await db.update(scene).set({ name, groupId, sortOrder }).where(eq(scene.id, id));
	void getScene(id).refresh();
});

/** Its parts, masks and palettes go with it. */
export const deleteScene = command(entryId, async (id) => {
	assertAdmin();
	const parts = await db
		.select({ id: scenePart.id })
		.from(scenePart)
		.where(eq(scenePart.sceneId, id));
	await db.delete(scene).where(eq(scene.id, id));
	await deletePhotos(DIR, [id]);
	await deleteMasks(
		DIR,
		parts.map((part) => part.id)
	);
});

/**
 * A new photo, which keeps the masks, so they need to fit it; or a layered file such as an
 * edited download of the scene's layers, which also replaces the masks of its named layers.
 */
export const uploadPhoto = form(
	v.object({ sceneId: v.string(), photo: v.optional(v.file()) }),
	async ({ sceneId, photo: file }) => {
		assertAdmin();
		const { photo, masks } = await readPhotoUpload(file);
		const [found] = await db.select({ id: scene.id }).from(scene).where(eq(scene.id, sceneId));
		const size = found && photo && (await savePhoto(DIR, found.id, photo));
		if (!found || !photo || !size) invalid('Invalid photo');
		await db
			.update(scene)
			.set({ ...size, photoVersion: Date.now() })
			.where(eq(scene.id, found.id));
		await importMasks(found.id, masks);
		void getScene(sceneId).refresh();
	}
);

// Unlike colour and palette groups, scene group names aren't unique.
export const saveSceneGroup = form(groupForm, async (group) => {
	assertAdmin();
	await saveGroup(sceneGroup, group, { unique: false });
	void getScenes().refresh();
});

/** Its scenes stay, on their own. */
export const deleteSceneGroup = command(entryId, async (id) => {
	assertAdmin();
	await deleteGroup(sceneGroup, id);
	void getScenes().refresh();
});

export const importScenes = form(importForm, async ({ file, mode }) => {
	assertAdmin();
	const result = await importScenesFile(file, mode === 'replace');
	void getScenes().refresh();
	return result;
});

/** Limits changes to the scene's parts. */
const partOf = (sceneId: string, id: string) =>
	and(eq(scenePart.id, id), eq(scenePart.sceneId, sceneId));

/** Invalid when another part of the scene has its layer, ignoring case. */
export const savePart = form(partForm, async ({ id, sceneId, sortOrder, ...fields }) => {
	assertAdmin();
	const [taken] = await db
		.select({ id: scenePart.id })
		.from(scenePart)
		.where(
			and(
				eq(scenePart.sceneId, sceneId),
				eq(sql`lower(${scenePart.layer})`, fields.layer.toLowerCase()),
				ne(scenePart.id, id ?? '')
			)
		);
	if (taken) invalid('Layer taken');
	const row = { ...fields, sortOrder };
	if (id) await db.update(scenePart).set(row).where(partOf(sceneId, id));
	else await db.insert(scenePart).values({ ...row, sceneId });
	void getScene(sceneId).refresh();
});

const partRef = v.object({ sceneId: v.string(), partId: v.string() });

/** Its mask goes with it; palettes keep its layer's colour, for other scenes or until they're next saved. */
export const deletePart = command(partRef, async ({ sceneId, partId }) => {
	assertAdmin();
	const [part] = await db
		.delete(scenePart)
		.where(partOf(sceneId, partId))
		.returning({ id: scenePart.id });
	if (part) await deleteMasks(DIR, [part.id]);
	void getScene(sceneId).refresh();
});

/** The part, if it belongs to the scene. */
async function findPart(sceneId: string, partId: string) {
	const [part] = await db
		.select({ id: scenePart.id })
		.from(scenePart)
		.where(partOf(sceneId, partId));
	return part?.id;
}

/** The part's mask image, replacing any previous one. */
export const saveMask = form(
	v.object({ sceneId: v.string(), partId: v.string(), mask: v.optional(v.file()) }),
	async ({ sceneId, partId, mask }) => {
		assertAdmin();
		const part = await findPart(sceneId, partId);
		const image = await imageFile(mask);
		const coverage = part && image && (await writeMask(DIR, part, image));
		if (!part || typeof coverage !== 'number') invalid('Invalid mask');
		await db
			.update(scenePart)
			.set({ maskVersion: Date.now(), coverage })
			.where(eq(scenePart.id, part));
		void getScene(sceneId).refresh();
	}
);

export const deleteMask = command(partRef, async ({ sceneId, partId }) => {
	assertAdmin();
	const part = await findPart(sceneId, partId);
	if (!part) error(400, 'Invalid part');
	await db.update(scenePart).set({ maskVersion: null, coverage: 0 }).where(eq(scenePart.id, part));
	await deleteMasks(DIR, [part]);
	void getScene(sceneId).refresh();
});
