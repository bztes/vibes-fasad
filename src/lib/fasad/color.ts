import type { Color, MixAdjust, MixPart, SavedColor } from './types.ts';

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex(rgb: Rgb) {
	return (
		'#' +
		rgb
			.map((channel) =>
				Math.round(Math.max(0, Math.min(255, channel)))
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

const toLinear = (channel: number) => {
	const c = channel / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (c: number) =>
	255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);

function toOklab(hex: string): Rgb {
	const [r, g, b] = hexToRgb(hex).map(toLinear);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

function fromOklab([L, a, b]: Rgb) {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return rgbToHex([
		fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
	]);
}

/** Perceived lightness, 0 (black) to 1 (white). */
export const lightness = (hex: string) => toOklab(hex)[0];

/** Whether dark text reads better than light text on this colour. */
export const isLight = (hex: string) => lightness(hex) > 0.72;

/**
 * Mixes colours like pigments rather than light (Kubelka–Munk, per channel):
 * blue and yellow lean green, and a little black darkens a lot.
 */
export function mixColors(parts: Pick<MixPart, 'hex' | 'parts'>[]): string | null {
	const used = parts.filter((part) => part.parts > 0);
	const total = used.reduce((sum, part) => sum + part.parts, 0);
	if (!total) return null;

	const absorption = [0, 0, 0];
	for (const part of used) {
		hexToRgb(part.hex).forEach((channel, index) => {
			const reflectance = Math.max(toLinear(channel), 0.0005);
			absorption[index] += ((part.parts / total) * (1 - reflectance) ** 2) / (2 * reflectance);
		});
	}

	return rgbToHex(absorption.map((ks) => fromLinear(1 + ks - Math.sqrt(ks * ks + 2 * ks))) as Rgb);
}

/** The mix with one more part of the colour, added as a new one if it isn't in yet. */
export function addPart(mix: MixPart[], { name, hex, code }: Color, parts = 1): MixPart[] {
	const existing = mix.find((part) => part.hex === hex.toLowerCase());
	if (!existing) return [...mix, { hex: hex.toLowerCase(), name, ...(code && { code }), parts }];
	existing.parts += parts;
	return mix;
}

/**
 * Adds `color` to `mix`: every colour of the saved mix in that colour, in the parts its recipe
 * calls for, if there is one, otherwise the colour itself.
 */
export function addColor(mix: MixPart[], color: Color, library: SavedColor[]): MixPart[] {
	const hex = color.hex.toLowerCase();
	const mixed = library.find((saved) => saved.hex === hex && saved.recipe.length);
	if (!mixed) return addPart(mix, color);
	return mixed.recipe.reduce((next, part) => addPart(next, part, part.parts), mix);
}

/**
 * A mixing bench starting from `color`: the recipe of the saved mix in that colour, which saving
 * then changes (`editingId`), if there is one, otherwise the colour itself as a one-colour mix,
 * named as saved, if it is.
 */
export function benchFor(color: Color, library: SavedColor[]) {
	const hex = color.hex.toLowerCase();
	const mixed = library.find((saved) => saved.hex === hex && saved.recipe.length);
	if (mixed) return { mix: mixed.recipe.map((part) => ({ ...part })), editingId: mixed.id };
	return {
		mix: addPart([], library.find((saved) => saved.hex === hex) ?? color),
		editingId: null
	};
}

/** A mix of a single colour is still the colour it was entered as, so it keeps its code. */
export function mixCode(parts: MixPart[]) {
	const used = parts.filter((part) => part.parts > 0);
	return used.length === 1 ? used[0].code : undefined;
}

/** Proportions as a ring around the result, like pouring colours into a tin; undefined while empty. */
export function mixRing(parts: Pick<MixPart, 'hex' | 'parts'>[]): string | undefined {
	const used = parts.filter((part) => part.parts > 0);
	const total = used.reduce((sum, part) => sum + part.parts, 0);
	let start = 0;
	const stops = used.map((part) => {
		const end = start + (part.parts / total) * 100;
		const stop = `${part.hex} ${start}% ${end}%`;
		start = end;
		return stop;
	});
	return stops.length ? `conic-gradient(${stops.join(', ')})` : undefined;
}

export const NO_ADJUST: MixAdjust = { lightness: 0, saturation: 0, warmth: 0 };

/** Fine-tunes a colour in OKLab so lightness, chroma and warmth move independently. */
export function adjust(hex: string, { lightness, saturation, warmth }: MixAdjust) {
	if (!lightness && !saturation && !warmth) return hex;
	const [L, a, b] = toOklab(hex);
	const chroma = 1 + saturation / 100;
	return fromOklab([
		Math.max(0, Math.min(1, L + (lightness / 100) * 0.3)),
		a * chroma + (warmth / 100) * 0.02,
		b * chroma + (warmth / 100) * 0.06
	]);
}
