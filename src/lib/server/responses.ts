/** A WebP whose URL is versioned by its query string, so it can be cached for good. */
export const immutableWebp = (image: Uint8Array) =>
	new Response(new Uint8Array(image), {
		headers: {
			'content-type': 'image/webp',
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});

/** A file to download, e.g. `fasad-colors-2026-10-30.json` for a dated export. */
export const attachment = (body: BodyInit, type: string, filename: string) =>
	new Response(body, {
		headers: {
			'content-type': type,
			'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
		}
	});

/** Today's date as `YYYY-MM-DD`, for export file names. */
export const today = () => new Date().toISOString().slice(0, 10);
