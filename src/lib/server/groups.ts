import { invalid } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { DUPLICATE } from '#lib/admin/issues.ts';
import { db } from '#lib/server/db/index.ts';
import { colorGroup, paletteGroup, sceneGroup } from '#lib/server/db/schema.ts';

type GroupTable = typeof colorGroup | typeof paletteGroup | typeof sceneGroup;

/** Adds the group, or renames and moves it with `id`; invalid if another group has its name. */
export async function saveGroup(
	table: GroupTable,
	{ id, name, sortOrder }: { id?: string; name: string; sortOrder: number },
	{ unique = true } = {}
) {
	if (unique) {
		const taken = await db.select({ id: table.id }).from(table).where(eq(table.name, name));
		if (taken.some((row) => row.id !== id)) invalid(DUPLICATE);
	}
	if (id) await db.update(table).set({ name, sortOrder }).where(eq(table.id, id));
	else await db.insert(table).values({ name, sortOrder });
}

/** Deletes the group; its entries stay, outside any group, by the schema's `set null`. */
export async function deleteGroup(table: GroupTable, id: string) {
	await db.delete(table).where(eq(table.id, id));
}
