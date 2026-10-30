import { command, form, query } from '$app/server';
import { asc, eq } from 'drizzle-orm';
import { assertAdmin, colorForm, entryId, groupForm, importForm } from '#lib/server/admin.ts';
import { importCatalog } from '#lib/server/catalog-file.ts';
import { db } from '#lib/server/db/index.ts';
import { colorGroup, catalogColor } from '#lib/server/db/schema.ts';
import { deleteGroup, saveGroup } from '#lib/server/groups.ts';

export const getColors = query(async () => {
	assertAdmin();
	const [groups, colors] = await Promise.all([
		db.select().from(colorGroup).orderBy(asc(colorGroup.sortOrder), asc(colorGroup.name)),
		db.select().from(catalogColor).orderBy(asc(catalogColor.sortOrder))
	]);
	return { groups, colors };
});

export const saveColor = form(colorForm, async ({ id, code, ...fields }) => {
	assertAdmin();
	const row = { ...fields, code: code || null };
	if (id) await db.update(catalogColor).set(row).where(eq(catalogColor.id, id));
	else await db.insert(catalogColor).values(row);
	void getColors().refresh();
});

export const deleteColor = command(entryId, async (id) => {
	assertAdmin();
	await db.delete(catalogColor).where(eq(catalogColor.id, id));
	void getColors().refresh();
});

export const saveColorGroup = form(groupForm, async (group) => {
	assertAdmin();
	await saveGroup(colorGroup, group);
	void getColors().refresh();
});

/** Keeps the group's colours, now outside any group. */
export const deleteColorGroup = command(entryId, async (id) => {
	assertAdmin();
	await deleteGroup(colorGroup, id);
	void getColors().refresh();
});

export const importColors = form(importForm, async ({ file, mode }) => {
	assertAdmin();
	const result = await importCatalog('colors', file, mode === 'replace');
	void getColors().refresh();
	return result;
});
