import { exportCatalog } from '#lib/server/catalog-file.ts';
import { attachment, today } from '#lib/server/responses.ts';
import type { RequestHandler } from './$types';

/** The palettes as a JSON file `importPalettes` reads back. Access is enforced in hooks.server.ts. */
export const GET: RequestHandler = async () => {
	return attachment(
		JSON.stringify(await exportCatalog('palettes'), null, '\t'),
		'application/json',
		`fasad-palettes-${today()}.json`
	);
};
