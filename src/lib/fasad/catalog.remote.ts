import { query } from '$app/server';
import { asc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { colorGroup, catalogColor, palette, paletteGroup } from '#lib/server/db/schema.ts';
import { loadGroups, loadScenes } from '#lib/server/scenes.ts';

/** Scenes and their groups, presets and the colour catalogue: small, and used by every studio page. */
export const getCatalog = query(async () => {
	const [scenes, groups, palettes, colors] = await Promise.all([
		loadScenes(),
		loadGroups(),
		db
			.select({ ...getTableColumns(palette), group: paletteGroup.name })
			.from(palette)
			.leftJoin(paletteGroup, eq(palette.groupId, paletteGroup.id))
			.where(isNull(palette.projectId))
			// Palettes outside any group go last.
			.orderBy(
				sql`${paletteGroup.id} is null`,
				asc(paletteGroup.sortOrder),
				asc(paletteGroup.name),
				asc(palette.sortOrder)
			),
		db
			.select({ ...getTableColumns(catalogColor), group: colorGroup.name })
			.from(catalogColor)
			.leftJoin(colorGroup, eq(catalogColor.groupId, colorGroup.id))
			// Colours outside any group go last.
			.orderBy(
				sql`${colorGroup.id} is null`,
				asc(colorGroup.sortOrder),
				asc(colorGroup.name),
				asc(catalogColor.sortOrder)
			)
	]);

	return {
		scenes: scenes.map(({ id, groupId, name, photo, width, height, parts }) => ({
			id,
			groupId,
			name,
			photo,
			width,
			height,
			parts: parts.map(({ id, layer, name, hint, icon, mask, area }) => ({
				id,
				layer,
				name,
				hint,
				icon,
				mask,
				area
			}))
		})),
		groups: groups.map(({ id, name }) => ({ id, name })),
		presets: palettes.map(({ id, name, colors, group, groupId }) => ({
			id,
			name,
			colors,
			group,
			groupId
		})),
		catalog: colors.map(({ id, code, hex, name, group, groupId }) => ({
			id,
			code,
			hex,
			group,
			groupId,
			name
		}))
	};
});
