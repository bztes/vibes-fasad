import { DIR } from '$app/env/private';
import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { ORA_TYPE } from '#lib/fasad/openraster.ts';
import { db } from '#lib/server/db/index.ts';
import { scene, scenePart } from '#lib/server/db/schema.ts';
import { readPhoto } from '#lib/server/photos.ts';
import { attachment } from '#lib/server/responses.ts';
import { sceneOra, slug } from '#lib/server/scene-file.ts';
import type { RequestHandler } from './$types';

/**
 * The scene's photo and masks as OpenRaster, to edit the masks in GIMP or Krita and upload again.
 * Access is enforced in hooks.server.ts.
 */
export const GET: RequestHandler = async ({ params }) => {
	const [found] = await db
		.select({ id: scene.id, name: scene.name })
		.from(scene)
		.where(eq(scene.id, params.sceneId));
	const photo = found && (await readPhoto(DIR, found.id));
	if (!photo) error(404, 'Not found');

	const parts = await db
		.select({ id: scenePart.id, layer: scenePart.layer, maskVersion: scenePart.maskVersion })
		.from(scenePart)
		.where(eq(scenePart.sceneId, found.id))
		.orderBy(asc(scenePart.sortOrder));

	return attachment(
		new Uint8Array(await sceneOra(photo, parts)),
		ORA_TYPE,
		`${slug(found.name) || 'scene'}.ora`
	);
};
