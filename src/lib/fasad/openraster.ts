import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/**
 * OpenRaster (.ora), the layered format of GIMP and Krita: a zip holding `stack.xml`, which lists
 * the layers top first, and each layer as a PNG, plus a flattened image and a thumbnail.
 * https://www.openraster.org/
 */

export const ORA_TYPE = 'image/openraster';

export type OraLayer = {
	name: string;
	png: Uint8Array;
	/** Offset of the layer's PNG on the canvas, which it may cover only part of. */
	x?: number;
	y?: number;
	/** 0…1; editors show it, it doesn't change the layer's pixels. */
	opacity?: number;
};

const escape = (text: string) =>
	text.replace(
		/[&<>"]/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!
	);

const unescape = (text: string) =>
	text.replace(
		/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,
		(_, entity: string) =>
			({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()] ??
			String.fromCodePoint(
				entity[1].toLowerCase() === 'x'
					? Number.parseInt(entity.slice(2), 16)
					: Number.parseInt(entity.slice(1), 10)
			)
	);

/** `layers` go top first; `merged` is them flattened, `thumbnail` the same at most 256 px wide and high. */
export function writeOra({
	width,
	height,
	layers,
	merged,
	thumbnail
}: {
	width: number;
	height: number;
	layers: OraLayer[];
	merged: Uint8Array;
	thumbnail: Uint8Array;
}) {
	const entries = layers.map(
		({ name, x = 0, y = 0, opacity = 1 }, index) =>
			`<layer name="${escape(name)}" src="data/layer${index}.png" x="${x}" y="${y}" opacity="${opacity}" visibility="visible"/>`
	);
	const stack = `<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.5" w="${width}" h="${height}"><stack>
${entries.join('\n')}
</stack></image>
`;
	// The mimetype must come first and uncompressed, so the file can be recognised by its start.
	return zipSync({
		mimetype: [strToU8(ORA_TYPE), { level: 0 }],
		'stack.xml': strToU8(stack),
		...Object.fromEntries(
			layers.map(({ png }, index) => [`data/layer${index}.png`, [png, { level: 0 }]])
		),
		'mergedimage.png': [merged, { level: 0 }],
		'Thumbnails/thumbnail.png': [thumbnail, { level: 0 }]
	});
}

/** Whether `bytes` start like an OpenRaster file, whose first entry names its type. */
export function isOra(bytes: Uint8Array) {
	return strFromU8(bytes.subarray(30, 54)) === `mimetype${ORA_TYPE}`;
}

const attribute = (tag: string, name: string) =>
	tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`))?.[1];

/**
 * The canvas size and every layer, top first, flattening groups; undefined if the file can't be
 * read. Layers whose PNG is missing are left out.
 */
export function readOra(bytes: Uint8Array) {
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(bytes);
	} catch {
		return undefined;
	}
	const stack = files['stack.xml'] && strFromU8(files['stack.xml']);
	const image = stack?.match(/<image\b[^>]*>/)?.[0];
	const width = Number(image && attribute(image, 'w'));
	const height = Number(image && attribute(image, 'h'));
	if (!stack || !(width > 0) || !(height > 0)) return undefined;

	const layers: Required<OraLayer>[] = [];
	for (const [tag] of stack.matchAll(/<layer\b[^>]*>/g)) {
		const png = files[unescape(attribute(tag, 'src') ?? '')];
		if (!png) continue;
		layers.push({
			name: unescape(attribute(tag, 'name') ?? ''),
			png,
			x: Math.round(Number(attribute(tag, 'x') ?? 0)) || 0,
			y: Math.round(Number(attribute(tag, 'y') ?? 0)) || 0,
			opacity: Number(attribute(tag, 'opacity') ?? 1)
		});
	}
	return { width, height, layers };
}
