import { command, form, query } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { assertAdmin, entryId, groupForm, importForm, paletteForm } from '#lib/server/admin.ts';
import { importCatalog } from '#lib/server/catalog-file.ts';
import { db } from '#lib/server/db/index.ts';
import { palette, paletteGroup, scenePart } from '#lib/server/db/schema.ts';
import { deleteGroup, saveGroup } from '#lib/server/groups.ts';
import { loadScenes } from '#lib/server/scenes.ts';

export const getPalettes = query(async () => {
	assertAdmin();
	const [scenes, groups, palettes] = await Promise.all([
		loadScenes(),
		db.select().from(paletteGroup).orderBy(asc(paletteGroup.sortOrder), asc(paletteGroup.name)),
		// Templates; the others belong to projects.
		db.select().from(palette).where(isNull(palette.projectId)).orderBy(asc(palette.sortOrder))
	]);
	return { scenes, groups, palettes };
});

/** Templates only; project palettes are left alone. */
const template = (id: string) => and(eq(palette.id, id), isNull(palette.projectId));

/** The form's colours are for part layers; on update they're merged into the template's. */
export const savePalette = form(paletteForm, async ({ id, name, groupId, sortOrder, colors }) => {
	assertAdmin();
	const layers = Object.fromEntries(colors.map((color) => [color.layer, color.hex]));
	const [current] = id
		? await db.select({ colors: palette.colors }).from(palette).where(template(id))
		: [];
	// Layers the template already has may be of a deleted scene; new ones must be a scene's.
	const added = Object.keys(layers).filter((layer) => !current || !(layer in current.colors));
	const known = added.length
		? await db
				.selectDistinct({ layer: scenePart.layer })
				.from(scenePart)
				.where(inArray(scenePart.layer, added))
		: [];
	if (known.length !== added.length) invalid('Unknown part layer');

	const row = { name, groupId, sortOrder, colors: layers };
	if (id) {
		if (current) {
			await db
				.update(palette)
				.set({ ...row, colors: { ...current.colors, ...layers } })
				.where(template(id));
		}
	} else {
		await db.insert(palette).values(row);
	}
	void getPalettes().refresh();
});

export const deletePalette = command(entryId, async (id) => {
	assertAdmin();
	await db.delete(palette).where(template(id));
	void getPalettes().refresh();
});

export const savePaletteGroup = form(groupForm, async (group) => {
	assertAdmin();
	await saveGroup(paletteGroup, group);
	void getPalettes().refresh();
});

/** Keeps the group's palettes, now outside any group. */
export const deletePaletteGroup = command(entryId, async (id) => {
	assertAdmin();
	await deleteGroup(paletteGroup, id);
	void getPalettes().refresh();
});

export const importPalettes = form(importForm, async ({ file, mode }) => {
	assertAdmin();
	const result = await importCatalog('palettes', file, mode === 'replace');
	void getPalettes().refresh();
	return result;
});
