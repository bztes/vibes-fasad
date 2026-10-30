import { exportScenes } from '#lib/server/scene-file.ts';
import { attachment, today } from '#lib/server/responses.ts';
import type { RequestHandler } from './$types';

/**
 * Every scene and group with their photos and masks, as a zip `importScenes` reads back.
 * Access is enforced in hooks.server.ts.
 */
export const GET: RequestHandler = async () => {
	return attachment(
		new Uint8Array(await exportScenes()),
		'application/zip',
		`fasad-scenes-${today()}.zip`
	);
};
