import { hexToRgb } from './color.ts';

/**
 * Per-pixel data derived once from the photo and its masks. Each pixel belongs to the part
 * whose mask is strongest there, the later part where they tie, blended by that mask's
 * intensity, so recolouring is a single pass per colour change.
 */
export type Layers = {
	source: ImageData;
	layer: Uint8Array;
	alpha: Float32Array;
	/**
	 * The pixel's brightness relative to its part's typical brightness, in linear light: about 1
	 * on plain, well-lit wall, below in shadows and grain, above in highlights. A part that sits
	 * in shade as a whole stays below 1 throughout.
	 */
	shading: Float32Array;
};

/** sRGB channel value to linear light, 0…1. */
const LINEAR = Float32Array.from({ length: 256 }, (_, value) => {
	const c = value / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** Linear light in 0…1, in `SRGB_STEPS` steps, back to an sRGB channel value. */
const SRGB_STEPS = 4095;
const SRGB = Uint8ClampedArray.from({ length: SRGB_STEPS + 1 }, (_, step) => {
	const c = step / SRGB_STEPS;
	return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
});

/** Bins of the luminance histogram each part's median is read from. */
const BINS = 1024;
/** Strongest highlight kept, relative to the part's median, so specks don't blow out. */
const MAX_SHADING = 4;
/**
 * Linear brightest channel (sRGB 118) a part reaches in full light, whatever its colour: a
 * saturated red is dark but bright in red, while a part dark in every channel sits in shade.
 */
const LIT = 0.18;
/** Lightness times opacity, so both greyscale and white-on-transparent masks work. */
function maskValue(mask: ImageData, pixel: number) {
	const { data } = mask;
	return ((data[pixel] + data[pixel + 1] + data[pixel + 2]) * data[pixel + 3]) / (3 * 255 * 255);
}

/** The median of a histogram's values in 0…1; 1 for an empty one. */
function median(histogram: Uint32Array) {
	const total = histogram.reduce((sum, count) => sum + count, 0);
	let seen = 0;
	for (let bin = 0; bin < BINS; bin += 1) {
		seen += histogram[bin];
		if (seen * 2 >= total && total) return (bin + 0.5) / BINS;
	}
	return 1;
}

/** `masks` must be ordered like the scene's parts and match the source dimensions. */
export function buildLayers(source: ImageData, masks: ImageData[]): Layers {
	const pixelCount = source.width * source.height;
	const layer = new Uint8Array(pixelCount);
	const alpha = new Float32Array(pixelCount);
	const shading = new Float32Array(pixelCount);
	const histograms = masks.map(() => new Uint32Array(BINS));
	const brightest = masks.map(() => new Uint32Array(BINS));

	for (let index = 0; index < pixelCount; index += 1) {
		const pixel = index * 4;
		let strongestLayer = 0;
		let strongestAlpha = 0;

		for (let candidate = 0; candidate < masks.length; candidate += 1) {
			const value = maskValue(masks[candidate], pixel);
			if (value > 0 && value >= strongestAlpha) {
				strongestLayer = candidate;
				strongestAlpha = value;
			}
		}

		const [red, green, blue] = [
			LINEAR[source.data[pixel]],
			LINEAR[source.data[pixel + 1]],
			LINEAR[source.data[pixel + 2]]
		];
		const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
		layer[index] = strongestLayer;
		alpha[index] = strongestAlpha;
		shading[index] = luminance;
		// Only pixels clearly inside a part decide what its plain surface looks like.
		if (strongestAlpha >= 0.5) {
			histograms[strongestLayer][Math.min(BINS - 1, Math.floor(luminance * BINS))] += 1;
			const channel = Math.max(red, green, blue);
			brightest[strongestLayer][Math.min(BINS - 1, Math.floor(channel * BINS))] += 1;
		}
	}

	const medians = histograms.map(median);
	const light = brightest.map((histogram) => Math.min(1, median(histogram) / LIT));
	for (let index = 0; index < pixelCount; index += 1) {
		const part = layer[index];
		shading[index] =
			Math.min(MAX_SHADING, shading[index] / Math.max(medians[part], 1e-4)) * light[part];
	}

	return { source, layer, alpha, shading };
}

/**
 * Colour in linear light, lit like the photo: exact on plain wall, darker in shadows, and in
 * highlights easing towards white instead of clipping.
 */
export function shade(channel: number, shading: number) {
	const lit =
		shading <= 1 || channel >= 1
			? channel * shading
			: channel + (1 - channel) * (1 - Math.exp((channel * (1 - shading)) / (1 - channel)));
	return SRGB[Math.round(Math.min(1, lit) * SRGB_STEPS)];
}

const linearColors = (colors: (string | null)[]) =>
	colors.map((hex) => hex && hexToRgb(hex).map((channel) => LINEAR[channel]));

/**
 * Paints each part in its colour (hex, ordered like the masks; null leaves it) over the photo. The colour keeps
 * its own lightness, and the photo only adds its shadows, grain and highlights.
 */
export function recolor({ source, layer, alpha, shading }: Layers, colors: (string | null)[]) {
	const rgb = linearColors(colors);
	const output = new Uint8ClampedArray(source.data);

	for (let index = 0; index < layer.length; index += 1) {
		const weight = alpha[index];
		const color = rgb[layer[index]];
		// No colour for an unpainted part, or while a new scene's layers are still loading.
		if (weight < 0.01 || !color) continue;

		const pixel = index * 4;
		for (let channel = 0; channel < 3; channel += 1) {
			output[pixel + channel] =
				source.data[pixel + channel] * (1 - weight) +
				shade(color[channel], shading[index]) * weight;
		}
	}

	return new ImageData(output, source.width, source.height);
}

/**
 * Each part painted on its own, transparent elsewhere, e.g. as layers above the photo in an
 * export: stacked in order over it, they match `recolor`.
 */
export function paintLayers({ source, layer, alpha, shading }: Layers, colors: (string | null)[]) {
	const rgb = linearColors(colors);
	const outputs = colors.map(() => new Uint8ClampedArray(source.data.length));

	for (let index = 0; index < layer.length; index += 1) {
		const weight = alpha[index];
		const color = rgb[layer[index]];
		if (weight < 0.01 || !color) continue;

		const pixel = index * 4;
		const output = outputs[layer[index]];
		for (let channel = 0; channel < 3; channel += 1) {
			output[pixel + channel] = shade(color[channel], shading[index]);
		}
		output[pixel + 3] = weight * 255;
	}

	return outputs.map((output) => new ImageData(output, source.width, source.height));
}
