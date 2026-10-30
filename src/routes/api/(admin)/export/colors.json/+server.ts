import { exportCatalog } from '#lib/server/catalog-file.ts';
import { attachment, today } from '#lib/server/responses.ts';
import type { RequestHandler } from './$types';

/** The colors as a JSON file `importColors` reads back. Access is enforced in hooks.server.ts. */
export const GET: RequestHandler = async () => {
	return attachment(
		JSON.stringify(await exportCatalog('colors'), null, '\t'),
		'application/json',
		`fasad-colors-${today()}.json`
	);
};
