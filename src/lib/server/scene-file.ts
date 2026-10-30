import { DIR } from '$app/env/private';
import { asc, eq, inArray, notInArray } from 'drizzle-orm';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import * as v from 'valibot';
import { maskColor } from '#lib/fasad/scene.ts';
import { PART_ICONS } from '#lib/fasad/types.ts';
import { db } from '#lib/server/db/index.ts';
import { scene, scenePart, sceneGroup } from '#lib/server/db/schema.ts';
import {
	ImportError,
	parseImport,
	runImport,
	type ImportResult,
	type Tx
} from '#lib/server/import-file.ts';
import { readLayeredView, writeLayeredView } from '#lib/server/openraster.ts';
import { layerName, partForMask } from '#lib/server/scenes.ts';
import { name } from '#lib/server/schemas.ts';
import { deleteMasks, deletePhotos, readMask, readPhoto, saveMask, savePhoto } from './photos.ts';

/**
 * Scenes exported from /admin/scenes: a zip holding `scenes.json` and next to it one OpenRaster
 * file per scene, as downloaded from a scene's page (the bottom layer is the photo, every other
 * layer a part's mask, see `readLayeredView`).
 *
 *   { version: 1,
 *     groups?: [{ id, name, sortOrder? }],
 *     scenes: [{ id?, name, groupId?, sortOrder?, file: "scandi-wooden-house.ora",
 *       parts?: [{ id?, layer?, name, hint?, icon?, sortOrder? }] }] }
 *
 * A part's mask is its `layer`, ignoring case, which defaults to its name and must be unique in
 * the scene; it also keys the part's colour in palettes and projects. A part whose layer isn't in
 * the file has no mask. Layers no part names become parts of their own, as when uploading the
 * file in the admin. Ids are kept; rows without one get a fresh one. A scene's `groupId` names a group in the file or the database. Parts
 * default to the order they're listed in.
 * Importing a scene replaces the one with its id, parts included.
 */
const FILE = 'scenes.json';

/** Ids name files on disk, so they're kept to safe characters. */
const id = v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/, 'Use letters, digits, - and _'));
const sortOrder = v.optional(v.pipe(v.number(), v.integer()));

const scenesFile = v.object({
	version: v.literal(1),
	groups: v.optional(v.array(v.object({ id, name, sortOrder: v.optional(sortOrder, 0) })), []),
	scenes: v.array(
		v.object({
			id: v.optional(id),
			name,
			groupId: v.optional(v.nullable(id), null),
			sortOrder,
			file: v.pipe(v.string(), v.nonEmpty()),
			parts: v.optional(
				v.array(
					v.object({
						id: v.optional(id),
						layer: v.optional(name),
						name,
						hint: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200)), ''),
						icon: v.optional(v.picklist(PART_ICONS), 'paint'),
						sortOrder
					})
				),
				[]
			)
		})
	)
});

/** A file name for `name`, e.g. "scandi-wooden-house". */
export const slug = (name: string) => layerName(name).replace(/[^\p{L}\p{N}]+/gu, '-');

/**
 * The photo with the masks of `parts`, in part order, as OpenRaster, coloured as on the scene's
 * admin page.
 */
export async function sceneOra(
	photo: Buffer,
	parts: { id: string; layer: string; maskVersion: number | null }[]
) {
	const masks = await Promise.all(
		parts.map(async (part, index) => {
			const mask = part.maskVersion === null ? undefined : await readMask(DIR, part.id);
			return mask ? [{ name: part.layer, color: maskColor(index), mask }] : [];
		})
	);
	return writeLayeredView(photo, masks.flat());
}

/** Every scene and group, each scene as OpenRaster, as a zip `importScenes` reads back. */
export async function exportScenes() {
	const [groups, scenes, parts] = await Promise.all([
		db
			.select({ id: sceneGroup.id, name: sceneGroup.name, sortOrder: sceneGroup.sortOrder })
			.from(sceneGroup)
			.orderBy(asc(sceneGroup.sortOrder)),
		db.select().from(scene).orderBy(asc(scene.sortOrder)),
		db.select().from(scenePart).orderBy(asc(scenePart.sortOrder))
	]);

	const files: Record<string, Uint8Array> = {};
	const rows = [];
	for (const row of scenes) {
		const photo = await readPhoto(DIR, row.id);
		if (!photo) continue;
		const ofScene = parts.filter((part) => part.sceneId === row.id);
		const sceneParts = ofScene.map(({ id, layer, name, hint, icon, sortOrder }) => ({
			id,
			layer,
			name,
			hint,
			icon,
			sortOrder
		}));
		let file = `${slug(row.name) || row.id}.ora`;
		if (files[file]) file = `${slug(row.name)}-${row.id}.ora`;
		files[file] = await sceneOra(photo, ofScene);
		const { id, name, groupId, sortOrder } = row;
		rows.push({ id, name, groupId, sortOrder, file, parts: sceneParts });
	}

	const json = JSON.stringify({ version: 1, groups, scenes: rows }, null, '\t');
	// OpenRaster is a zip already.
	return zipSync({
		[FILE]: strToU8(json),
		...Object.fromEntries(
			Object.entries(files).map(([path, bytes]) => [path, [bytes, { level: 0 }]])
		)
	});
}

type Layered = NonNullable<Awaited<ReturnType<typeof readLayeredView>>>;

/** The zip's OpenRaster files by the paths the scenes name them by. */
async function readLayered(
	file: v.InferOutput<typeof scenesFile>,
	entries: Record<string, Uint8Array>
) {
	const layered = new Map<string, Layered>();
	for (const { file: path } of file.scenes) {
		if (layered.has(path)) continue;
		const bytes = entries[path.replace(/^\.?\//, '')];
		if (!bytes) throw new ImportError(`${path}: not in the file`);
		const view = await readLayeredView(bytes);
		if (!view) throw new ImportError(`${path}: not a layered OpenRaster file`);
		layered.set(path, view);
	}
	return layered;
}

/** Writes the scenes; resolves to the scenes and parts it removed, whose files are deleted after. */
async function writeScenes(
	tx: Tx,
	file: v.InferOutput<typeof scenesFile>,
	layered: Map<string, Layered>,
	replace: boolean
) {
	const removedScenes: string[] = [];
	const removedParts: string[] = [];
	if (replace) {
		// Scenes in the file are rewritten below, so their parts' masks are tidied up as on merge.
		const kept = new Set(file.scenes.flatMap((row) => row.id ?? []));
		removedScenes.push(
			...(await tx.select({ id: scene.id }).from(scene))
				.map((row) => row.id)
				.filter((id) => !kept.has(id))
		);
		if (removedScenes.length) {
			removedParts.push(
				...(
					await tx
						.select({ id: scenePart.id })
						.from(scenePart)
						.where(inArray(scenePart.sceneId, removedScenes))
				).map((row) => row.id)
			);
			await tx.delete(scene).where(inArray(scene.id, removedScenes));
		}
		await tx.delete(sceneGroup).where(
			notInArray(
				sceneGroup.id,
				file.groups.map((row) => row.id)
			)
		);
	}

	for (const row of file.groups) {
		await tx.insert(sceneGroup).values(row).onConflictDoUpdate({ target: sceneGroup.id, set: row });
	}
	const groups = new Set(
		(await tx.select({ id: sceneGroup.id }).from(sceneGroup)).map((row) => row.id)
	);

	for (const [index, { parts: listed, file: path, ...fields }] of file.scenes.entries()) {
		const sceneId = fields.id ?? crypto.randomUUID();
		if (fields.groupId && !groups.has(fields.groupId)) {
			throw new ImportError(`scenes.${index}.groupId: no group ${fields.groupId}`);
		}
		const { photo, masks } = layered.get(path)!;
		const size = await savePhoto(DIR, sceneId, photo);
		if (!size) throw new ImportError(`${path}: unreadable photo`);
		const row = {
			...fields,
			id: sceneId,
			sortOrder: fields.sortOrder ?? index,
			...size,
			photoVersion: Date.now()
		};
		await tx.insert(scene).values(row).onConflictDoUpdate({ target: scene.id, set: row });

		const parts = listed.map((part, partIndex) => {
			const layer = part.layer ?? part.name;
			const mask = masks.find((mask) => layerName(mask.name) === layerName(layer));
			return {
				...part,
				id: part.id ?? crypto.randomUUID(),
				layer,
				sortOrder: part.sortOrder ?? partIndex,
				mask: mask?.mask
			};
		});
		const layers = parts.map((part) => layerName(part.layer));
		const repeated = parts.find(
			(part, partIndex) => layers.indexOf(layers[partIndex]) !== partIndex
		);
		if (repeated) {
			throw new ImportError(`scenes.${index}.parts: layer "${repeated.layer}" is used twice`);
		}
		// Layers come top first, and later parts are drawn on top, so new parts are added bottom first.
		const claimed = new Set(parts.flatMap((part) => part.mask ?? []));
		for (const { name, mask } of masks.toReversed()) {
			if (claimed.has(mask)) continue;
			parts.push({ id: crypto.randomUUID(), hint: '', ...partForMask(name, parts), mask });
		}

		const partIds = parts.map((part) => part.id);
		// Part ids are unique across scenes, so one can't be taken from another scene.
		const taken = await tx
			.select({ id: scenePart.id, sceneId: scenePart.sceneId })
			.from(scenePart)
			.where(inArray(scenePart.id, partIds));
		const clash = taken.find((part) => part.sceneId !== sceneId);
		if (clash) throw new ImportError(`part ${clash.id} belongs to scene ${clash.sceneId}`);

		const existing = await tx
			.select({ id: scenePart.id })
			.from(scenePart)
			.where(eq(scenePart.sceneId, sceneId));
		const gone = existing.filter((part) => !partIds.includes(part.id)).map((part) => part.id);
		if (gone.length) {
			await tx.delete(scenePart).where(inArray(scenePart.id, gone));
			removedParts.push(...gone);
		}

		for (const { mask, ...part } of parts) {
			const coverage = mask ? await saveMask(DIR, part.id, mask) : undefined;
			if (mask && coverage === undefined) throw new ImportError(`${path}: unreadable layer`);
			if (!mask) removedParts.push(part.id);
			const partRow = {
				...part,
				sceneId,
				maskVersion: mask ? Date.now() : null,
				coverage: coverage ?? 0
			};
			await tx
				.insert(scenePart)
				.values(partRow)
				.onConflictDoUpdate({ target: scenePart.id, set: partRow });
		}
	}
	return { removedScenes, removedParts };
}

/**
 * Imports an uploaded scenes zip, see the format above. `merge` replaces scenes and
 * groups whose id already exists and adds the rest; `replace` deletes all scenes and groups first.
 * The database is written in one transaction; photos and masks are written as it goes.
 */
export async function importScenes(
	upload: File | undefined,
	replace: boolean
): Promise<ImportResult> {
	if (!upload?.size) return { importError: 'missing' };

	let entries: Record<string, Uint8Array>;
	try {
		entries = unzipSync(new Uint8Array(await upload.arrayBuffer()));
	} catch {
		return { importError: 'zip' };
	}
	if (!entries[FILE]) return { importError: 'zip' };

	const parsed = parseImport(scenesFile, strFromU8(entries[FILE]), FILE);
	if (!('output' in parsed)) return parsed;

	return runImport(async () => {
		// Read up front, so a bad file leaves the scenes and their photos as they were.
		const layered = await readLayered(parsed.output, entries);
		const { removedScenes, removedParts } = await db.transaction((tx) =>
			writeScenes(tx, parsed.output, layered, replace)
		);
		await deletePhotos(DIR, removedScenes);
		await deleteMasks(DIR, removedParts);
		return parsed.output.scenes.length;
	});
}
