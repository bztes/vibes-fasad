import { buildLayers, type Layers } from './recolor.ts';
import type { Scene } from './types.ts';

function loadImage(url: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Could not load ${url}`));
		image.src = url;
	});
}

function pixels(
	width: number,
	height: number,
	draw: (context: OffscreenCanvasRenderingContext2D) => void
) {
	const buffer = new OffscreenCanvas(width, height);
	const context = buffer.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Canvas is not supported in this browser.');
	draw(context);
	return context.getImageData(0, 0, width, height);
}

const images = new Map<string, Promise<HTMLImageElement>>();
const layers = new Map<string, Promise<Layers>>();

function cachedImage(url: string) {
	let image = images.get(url);
	if (!image) {
		image = loadImage(url);
		image.catch(() => images.delete(url));
		images.set(url, image);
	}
	return image;
}

/**
 * A scene's photo and its parts' masks, scaled to at most `maxWidth`, built once per size and
 * shared. Masks are stretched over the photo; a part without one covers nothing. The key holds
 * the URLs, which change with each upload, so a new photo or mask builds new layers.
 */
export function loadLayers(scene: Scene, maxWidth = Infinity) {
	const masks = scene.parts.map((part) => part.mask);
	const key = JSON.stringify([scene.photo, masks, maxWidth]);
	let cached = layers.get(key);
	if (!cached) {
		cached = Promise.all([
			cachedImage(scene.photo),
			...masks.map((mask) => (mask ? cachedImage(mask) : undefined))
		]).then(([photo, ...maskImages]) => {
			const scale = Math.min(1, maxWidth / photo.naturalWidth);
			const width = Math.round(photo.naturalWidth * scale);
			const height = Math.round(photo.naturalHeight * scale);
			const draw = (image: HTMLImageElement | undefined) =>
				pixels(width, height, (context) => image && context.drawImage(image, 0, 0, width, height));
			return buildLayers(draw(photo), maskImages.map(draw));
		});
		cached.catch(() => layers.delete(key));
		layers.set(key, cached);
	}
	return cached;
}
