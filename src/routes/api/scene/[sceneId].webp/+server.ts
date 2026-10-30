import { DIR } from '$app/env/private';
import { error } from '@sveltejs/kit';
import { readPhoto } from '#lib/server/photos.ts';
import { immutableWebp } from '#lib/server/responses.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const photo = await readPhoto(DIR, params.sceneId);
	if (!photo) error(404, 'Not found');
	return immutableWebp(photo);
};
