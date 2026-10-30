import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * Scene photos live on disk as WebP, `<dir>/scenes/<scene id>.webp`, and their parts' masks as
 * lossless WebP, `<dir>/masks/<part id>.webp`; the database keeps their sizes and versions.
 * Takes the directory so scripts can use it outside the app.
 */
const photoPath = (dir: string, sceneId: string) => join(dir, 'scenes', `${sceneId}.webp`);
const maskPath = (dir: string, partId: string) => join(dir, 'masks', `${partId}.webp`);

/** Ids become file names, so reads turn anything else away. */
const ID = /^[\w-]+$/;

/**
 * Converts an uploaded image to WebP, upright, and stores it as the scene's photo, replacing any
 * previous one. Resolves to its size, or undefined if the image can't be read.
 */
export async function savePhoto(dir: string, sceneId: string, image: Buffer) {
	const converted = await sharp(image)
		.rotate()
		.webp({ quality: 88 })
		.toBuffer({ resolveWithObject: true })
		.catch(() => undefined);
	if (!converted) return undefined;
	const { data, info } = converted;
	const path = photoPath(dir, sceneId);
	await mkdir(join(dir, 'scenes'), { recursive: true });
	await writeFile(path, data);
	return { width: info.width, height: info.height };
}

async function readById(path: typeof photoPath, dir: string, id: string) {
	if (!ID.test(id)) return undefined;
	try {
		return await readFile(path(dir, id));
	} catch {
		return undefined;
	}
}

async function deleteByIds(path: typeof photoPath, dir: string, ids: string[]) {
	await Promise.all(ids.map((id) => rm(path(dir, id), { force: true })));
}

/** The scene's photo, or undefined if it has none. */
export const readPhoto = (dir: string, sceneId: string) => readById(photoPath, dir, sceneId);

/** Leaves the scenes' masks, see `deleteMasks`. */
export const deletePhotos = (dir: string, sceneIds: string[]) =>
	deleteByIds(photoPath, dir, sceneIds);

/**
 * A mask stretched to the size as raw RGBA. Its lightness times opacity, `(r + g + b) * a / 765`,
 * is how strongly it marks each pixel, as the studio reads it.
 */
export const maskPixels = (mask: Buffer, width: number, height: number) =>
	sharp(mask)
		.resize(width, height, { fit: 'fill' })
		.ensureAlpha()
		.toColourspace('srgb')
		.raw()
		.toBuffer();

/** Share of the image a mask marks, 0…1, averaged over a downscaled copy. */
async function maskCoverage(mask: Buffer) {
	const data = await maskPixels(mask, 256, 256);
	let total = 0;
	for (let pixel = 0; pixel < data.length; pixel += 4) {
		total += (data[pixel] + data[pixel + 1] + data[pixel + 2]) * data[pixel + 3];
	}
	return total / ((data.length / 4) * 765 * 255);
}

/**
 * Stores an uploaded image, upright, as the part's mask, losslessly as WebP to keep
 * its edges, replacing any previous one. Its alpha and lightness mark the part, so white on
 * transparent and greyscale both work; it's stretched over the photo when drawn. Resolves to
 * the share of the photo it marks, or undefined if the image can't be read.
 */
export async function saveMask(dir: string, partId: string, image: Buffer) {
	const converted = await sharp(image)
		.rotate()
		.webp({ lossless: true })
		.toBuffer()
		.catch(() => undefined);
	if (!converted) return undefined;
	await mkdir(join(dir, 'masks'), { recursive: true });
	await writeFile(maskPath(dir, partId), converted);
	return maskCoverage(converted);
}

/** The part's mask, or undefined if it has none. */
export const readMask = (dir: string, partId: string) => readById(maskPath, dir, partId);

/** Deletes the parts' masks. */
export const deleteMasks = (dir: string, partIds: string[]) => deleteByIds(maskPath, dir, partIds);
