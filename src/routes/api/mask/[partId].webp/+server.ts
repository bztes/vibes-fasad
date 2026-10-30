import { DIR } from '$app/env/private';
import { error } from '@sveltejs/kit';
import { readMask } from '#lib/server/photos.ts';
import { immutableWebp } from '#lib/server/responses.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const mask = await readMask(DIR, params.partId);
	if (!mask) error(404, 'Not found');
	return immutableWebp(mask);
};
