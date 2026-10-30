import { DIR } from '$app/env/private';
import { asc, eq } from 'drizzle-orm';
import { nextSort, PART_ICONS } from '#lib/fasad/types.ts';
import { db } from '#lib/server/db/index.ts';
import { scene, scenePart, sceneGroup } from '#lib/server/db/schema.ts';
import { saveMask } from '#lib/server/photos.ts';

// Root-absolute: `resolve` would make them relative to the page loading them, but they're shared
// across pages and refreshed by remote functions called from other pages.
const photoUrl = (sceneId: string, version: number) => `/api/scene/${sceneId}.webp?v=${version}`;
const maskUrl = (partId: string, version: number) => `/api/mask/${partId}.webp?v=${version}`;

/** Every scene (or just `id`) with its parts in order, linking to photos and masks instead of loading them. */
export async function loadScenes(id?: string) {
	const [scenes, parts] = await Promise.all([
		db
			.select()
			.from(scene)
			.where(id ? eq(scene.id, id) : undefined)
			.orderBy(asc(scene.sortOrder)),
		db
			.select()
			.from(scenePart)
			.where(id ? eq(scenePart.sceneId, id) : undefined)
			.orderBy(asc(scenePart.sortOrder))
	]);

	return scenes.map(({ photoVersion, ...row }) => ({
		...row,
		photo: photoUrl(row.id, photoVersion),
		parts: parts
			.filter((part) => part.sceneId === row.id)
			.map(({ maskVersion, coverage, ...part }) => ({
				...part,
				mask: maskVersion === null ? null : maskUrl(part.id, maskVersion),
				area: maskVersion === null ? 0 : coverage
			}))
	}));
}

export const loadGroups = () => db.select().from(sceneGroup).orderBy(asc(sceneGroup.sortOrder));

/** Whether a scene may be put in the group: none, or one that exists. */
export async function validGroup(id: string | null) {
	if (!id) return true;
	const [group] = await db
		.select({ id: sceneGroup.id })
		.from(sceneGroup)
		.where(eq(sceneGroup.id, id));
	return !!group;
}

export const layerName = (name: string) => name.trim().toLowerCase();

/** `name` as a layer none of `taken` has, ignoring case, e.g. "Facade 2" if "facade" is taken. */
function freshLayer(name: string, taken: Iterable<string>) {
	const known = new Set([...taken].map(layerName));
	const base = name.trim() || 'Part';
	let layer = base;
	for (let n = 2; known.has(layerName(layer)); n++) layer = `${base} ${n}`;
	return layer;
}

/** The first icon named in the layer, e.g. "Front frame" gets the frame. */
const layerIcon = (name: string) =>
	PART_ICONS.find((icon) => layerName(name).includes(icon)) ?? 'paint';

/**
 * A new part for the mask layer `name`, named after it, after `parts`. Layers come top first, and
 * later parts are drawn on top, so new parts are added for a file's layers bottom first.
 */
export function partForMask(name: string, parts: { layer: string; sortOrder: number }[]) {
	const sortOrder = nextSort(parts);
	const layer = freshLayer(
		name.trim() || `Part ${sortOrder + 1}`,
		parts.map((part) => part.layer)
	);
	return { layer, name: layer, icon: layerIcon(name), sortOrder };
}

/**
 * Stores the masks of an OpenRaster file in the scene: as its part on the layer, ignoring case,
 * or else as a new part on it, named after it.
 */
export async function importMasks(sceneId: string, masks: { name: string; mask: Buffer }[]) {
	if (!masks.length) return;
	const parts = await db
		.select({
			id: scenePart.id,
			layer: scenePart.layer,
			sortOrder: scenePart.sortOrder
		})
		.from(scenePart)
		.where(eq(scenePart.sceneId, sceneId));
	for (const { name, mask } of masks.toReversed()) {
		let partId = parts.find((part) => layerName(part.layer) === layerName(name))?.id;
		if (!partId) {
			const part = partForMask(name, parts);
			[{ id: partId }] = await db
				.insert(scenePart)
				.values({ sceneId, ...part })
				.returning({ id: scenePart.id });
			parts.push({ id: partId, layer: part.layer, sortOrder: part.sortOrder });
		}
		const coverage = await saveMask(DIR, partId, mask);
		if (coverage === undefined) continue;
		await db
			.update(scenePart)
			.set({ maskVersion: Date.now(), coverage })
			.where(eq(scenePart.id, partId));
	}
}
