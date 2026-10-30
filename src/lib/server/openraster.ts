import sharp from 'sharp';
import { hexToRgb } from '#lib/fasad/color.ts';
import { readOra, writeOra, type OraLayer } from '#lib/fasad/openraster.ts';
import { maskPixels } from '#lib/server/photos.ts';

type Canvas = { width: number; height: number };

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

/** A layer's PNG placed at its offset on a transparent canvas, cropped to it. */
async function place({ png, x = 0, y = 0 }: OraLayer, { width, height }: Canvas) {
	const blank = sharp({ create: { width, height, channels: 4, background: transparent } });
	const { width: layerWidth = 0, height: layerHeight = 0 } = await sharp(png).metadata();
	const left = Math.max(0, x);
	const top = Math.max(0, y);
	const right = Math.min(width, x + layerWidth);
	const bottom = Math.min(height, y + layerHeight);
	if (right <= left || bottom <= top) return blank.png().toBuffer();
	const visible = await sharp(png)
		.extract({ left: left - x, top: top - y, width: right - left, height: bottom - top })
		.png()
		.toBuffer();
	return blank
		.composite([{ input: visible, left, top }])
		.png()
		.toBuffer();
}

/**
 * The photo and masks in an OpenRaster file: the bottom layer is the photo, and every other
 * layer is a mask, marking its part where it's opaque whatever its colour. Masks come by layer
 * name, as greyscale PNGs. Undefined if it isn't a layered file with at least a photo.
 */
export async function readLayeredView(bytes: Uint8Array) {
	const ora = readOra(bytes);
	const photoLayer = ora?.layers.at(-1);
	if (!ora || !photoLayer) return undefined;
	try {
		const photo = await place(photoLayer, ora);
		const masks = await Promise.all(
			ora.layers.slice(0, -1).map(async (layer) => ({
				name: layer.name,
				mask: await sharp(await place(layer, ora))
					.extractChannel('alpha')
					.toColourspace('b-w')
					.png()
					.toBuffer()
			}))
		);
		return { photo, masks };
	} catch {
		return undefined;
	}
}

/** How strongly the mask marks each pixel, 0…255, see `maskPixels`. */
async function maskStrength(mask: Buffer, { width, height }: Canvas) {
	const data = await maskPixels(mask, width, height);
	const strength = new Uint8Array(width * height);
	for (let index = 0; index < strength.length; index += 1) {
		const pixel = index * 4;
		strength[index] = ((data[pixel] + data[pixel + 1] + data[pixel + 2]) * data[pixel + 3]) / 765;
	}
	return strength;
}

/** Opacity editors show mask layers at, so the photo stays visible under them. */
const MASK_OPACITY = 0.6;

/**
 * A view as OpenRaster: its masks as layers named after their parts, each in its own colour
 * where it marks it, above the photo. `readLayeredView` reads it back.
 */
export async function writeLayeredView(
	photo: Buffer,
	masks: { name: string; color: string; mask: Buffer }[]
) {
	const { width = 0, height = 0 } = await sharp(photo).metadata();
	const canvas = { width, height };
	const layers = await Promise.all(
		masks.map(async ({ name, color, mask }) => {
			const strength = await maskStrength(mask, canvas);
			const [r, g, b] = hexToRgb(color);
			const pixels = Buffer.alloc(width * height * 4);
			// Flattened, the layer shows at the opacity editors give it.
			const faded = Buffer.alloc(pixels.length);
			for (let index = 0; index < strength.length; index += 1) {
				const pixel = index * 4;
				pixels[pixel] = faded[pixel] = r;
				pixels[pixel + 1] = faded[pixel + 1] = g;
				pixels[pixel + 2] = faded[pixel + 2] = b;
				pixels[pixel + 3] = strength[index];
				faded[pixel + 3] = strength[index] * MASK_OPACITY;
			}
			const raw = { raw: { width, height, channels: 4 as const } };
			return {
				layer: { name, png: await sharp(pixels, raw).png().toBuffer(), opacity: MASK_OPACITY },
				faded: await sharp(faded, raw).png().toBuffer()
			};
		})
	);
	// Masks are listed like the parts, so later parts, which win where they overlap, go on top.
	const [photoPng, merged] = await Promise.all([
		sharp(photo).png().toBuffer(),
		sharp(photo)
			.composite(layers.map(({ faded }) => ({ input: faded })))
			.png()
			.toBuffer()
	]);
	return writeOra({
		width,
		height,
		layers: [...layers.map(({ layer }) => layer).reverse(), { name: 'Photo', png: photoPng }],
		merged,
		thumbnail: await sharp(merged).resize(256, 256, { fit: 'inside' }).png().toBuffer()
	});
}
