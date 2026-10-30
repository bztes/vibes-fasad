import { asc, eq, isNull, max } from 'drizzle-orm';
import * as v from 'valibot';
import { normalizeColorInput } from '#lib/fasad/color-input.ts';
import { db } from '#lib/server/db/index.ts';
import { catalogColor, colorGroup, palette, paletteGroup } from '#lib/server/db/schema.ts';
import { parseImport, runImport, type ImportResult, type Tx } from '#lib/server/import-file.ts';
import { hex, name } from '#lib/server/schemas.ts';

/**
 * JSON files exported from the admin pages:
 * `{ version: 2, groups?: [...], palettes: [...] }` or `{ version: 2, groups?: [...], colors: [...] }`.
 * Rows without an `id` get a fresh one on import. Colours and palettes name their group, which is
 * matched by name and created when missing. Palettes map part layers to colours and fit the
 * scenes with parts on those layers; older files also name a scene, which is ignored. Version 1
 * had no part keys; its palettes can't be imported.
 * Palettes, colours and groups are ordered by their position in the file; older files'
 * `sortOrder` is ignored.
 * A colour's `color` is hex, rgb(), hsl() or NCS; its `code` defaults to that notation unless
 * it's hex. Older files name it `hex`, which is still read. Older colour files name groups
 * `collections` and a colour's group `collection`, which is still read.
 * Names are plain text; older files have `{ en, se }`, read as the Swedish name for colours
 * (the manufacturer's) and the English one for palettes.
 */
const localizedName = (prefer: 'en' | 'se') =>
	v.pipe(
		v.union([
			v.string(),
			v.pipe(
				v.object({ en: v.optional(v.string()), se: v.optional(v.string()) }),
				v.transform(
					(text) =>
						(prefer === 'se' ? text.se?.trim() || text.en : text.en?.trim() || text.se) ?? ''
				)
			)
		]),
		name
	);

const id = v.optional(v.pipe(v.string(), v.nonEmpty(), v.maxLength(64)));
const optionalText = (max: number) =>
	v.pipe(
		v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(max))), null),
		v.transform((text) => text || null)
	);

const groupNames = v.optional(
	v.array(v.object({ name: v.pipe(v.string(), v.trim(), v.nonEmpty()) }))
);

const palettesFile = v.object({
	version: v.literal(2),
	groups: groupNames,
	palettes: v.array(
		v.object({
			id,
			name: localizedName('en'),
			group: optionalText(120),
			colors: v.record(v.string(), hex)
		})
	)
});

const color = v.pipe(
	v.string(),
	v.check((value) => !!normalizeColorInput(value), 'Invalid colour: use hex, rgb(), hsl() or NCS'),
	v.transform((value) => normalizeColorInput(value)!)
);

const colorsFile = v.object({
	version: v.union([v.literal(1), v.literal(2)]),
	groups: groupNames,
	collections: groupNames,
	colors: v.array(
		v.pipe(
			v.object({
				id,
				name: localizedName('se'),
				code: optionalText(60),
				group: optionalText(120),
				collection: optionalText(120),
				color: v.optional(color),
				hex: v.optional(color)
			}),
			v.check((row) => !!(row.color ?? row.hex), 'Missing color'),
			v.transform(({ color, hex, code, group, collection, ...row }) => {
				const parsed = (color ?? hex)!;
				const notation = parsed.code.startsWith('#') ? null : parsed.code;
				return { ...row, group: group ?? collection, hex: parsed.hex, code: code ?? notation };
			})
		)
	)
});

type CatalogTable = 'palettes' | 'colors';

export async function exportCatalog(table: CatalogTable) {
	if (table === 'palettes') {
		const [groups, palettes] = await Promise.all([
			db
				.select({ name: paletteGroup.name })
				.from(paletteGroup)
				.orderBy(asc(paletteGroup.sortOrder), asc(paletteGroup.name)),
			db
				.select({
					id: palette.id,
					name: palette.name,
					group: paletteGroup.name,
					colors: palette.colors
				})
				.from(palette)
				.leftJoin(paletteGroup, eq(palette.groupId, paletteGroup.id))
				.where(isNull(palette.projectId))
				.orderBy(asc(paletteGroup.sortOrder), asc(paletteGroup.name), asc(palette.sortOrder))
		]);
		return { version: 2, groups, palettes };
	}
	const [groups, colors] = await Promise.all([
		db
			.select({ name: colorGroup.name })
			.from(colorGroup)
			.orderBy(asc(colorGroup.sortOrder), asc(colorGroup.name)),
		db
			.select({
				id: catalogColor.id,
				name: catalogColor.name,
				code: catalogColor.code,
				group: colorGroup.name,
				color: catalogColor.hex
			})
			.from(catalogColor)
			.leftJoin(colorGroup, eq(catalogColor.groupId, colorGroup.id))
			.orderBy(asc(colorGroup.sortOrder), asc(colorGroup.name), asc(catalogColor.sortOrder))
	]);
	return { version: 2, groups, colors };
}

/**
 * Writes the file's groups (colour or palette groups) in its order, and returns a lookup of
 * group ids by name that creates groups named only on an entry after the existing ones.
 */
async function writeGroups(
	tx: Tx,
	table: typeof colorGroup | typeof paletteGroup,
	names: { name: string }[] = []
) {
	for (const [sortOrder, { name }] of names.entries()) {
		await tx
			.insert(table)
			.values({ name, sortOrder })
			.onConflictDoUpdate({ target: table.name, set: { sortOrder } });
	}

	const ids = new Map(
		(await tx.select({ id: table.id, name: table.name }).from(table)).map(
			(row) => [row.name, row.id] as const
		)
	);
	const [{ last }] = await tx.select({ last: max(table.sortOrder) }).from(table);
	let nextSort = (last ?? -1) + 1;
	return async (name: string | null) => {
		if (!name) return null;
		let id = ids.get(name);
		if (!id) {
			[{ id }] = await tx
				.insert(table)
				.values({ name, sortOrder: nextSort++ })
				.returning({ id: table.id });
			ids.set(name, id);
		}
		return id;
	};
}

async function writePalettes(tx: Tx, file: v.InferOutput<typeof palettesFile>, replace: boolean) {
	if (replace) {
		// Only templates: project palettes aren't part of the file.
		await tx.delete(palette).where(isNull(palette.projectId));
		await tx.delete(paletteGroup);
	}
	const groupId = await writeGroups(tx, paletteGroup, file.groups);
	for (const [sortOrder, { group, ...rest }] of file.palettes.entries()) {
		const row = { ...rest, sortOrder, groupId: await groupId(group) };
		await tx.insert(palette).values(row).onConflictDoUpdate({ target: palette.id, set: row });
	}
	return file.palettes.length;
}

async function writeColors(tx: Tx, file: v.InferOutput<typeof colorsFile>, replace: boolean) {
	if (replace) {
		await tx.delete(catalogColor);
		await tx.delete(colorGroup);
	}
	const groupId = await writeGroups(tx, colorGroup, file.groups ?? file.collections);
	for (const [sortOrder, { group, ...rest }] of file.colors.entries()) {
		const row = { ...rest, sortOrder, groupId: await groupId(group) };
		await tx
			.insert(catalogColor)
			.values(row)
			.onConflictDoUpdate({ target: catalogColor.id, set: row });
	}
	return file.colors.length;
}

const importers = {
	palettes: { schema: palettesFile, write: writePalettes },
	colors: { schema: colorsFile, write: writeColors }
} as const;

/**
 * Imports an uploaded file into one page's tables. `merge` updates rows whose id already exists
 * and adds the rest; `replace` empties the tables first. Runs in one transaction.
 */
export async function importCatalog(
	table: CatalogTable,
	file: File | undefined,
	replace: boolean
): Promise<ImportResult> {
	const { schema, write } = importers[table];
	if (!file?.size) return { importError: 'missing' };

	const parsed = parseImport(schema, await file.text(), 'file');
	if (!('output' in parsed)) return parsed;
	return runImport(() =>
		db.transaction((tx) =>
			// Each importer takes its own schema's output.
			(write as (tx: Tx, file: unknown, replace: boolean) => Promise<number>)(
				tx,
				parsed.output,
				replace
			)
		)
	);
}
