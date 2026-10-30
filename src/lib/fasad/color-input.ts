import { rgbToHex } from './color.ts';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hslToHex = (hueValue: number, saturationValue: number, lightnessValue: number) => {
	const hue = (((hueValue % 360) + 360) % 360) / 360;
	const saturation = clamp(saturationValue, 0, 100) / 100;
	const lightness = clamp(lightnessValue, 0, 100) / 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const x = chroma * (1 - Math.abs(((hue * 6) % 2) - 1));
	const match = lightness - chroma / 2;
	const [red, green, blue] =
		hue < 1 / 6
			? [chroma, x, 0]
			: hue < 2 / 6
				? [x, chroma, 0]
				: hue < 3 / 6
					? [0, chroma, x]
					: hue < 4 / 6
						? [0, x, chroma]
						: hue < 5 / 6
							? [x, 0, chroma]
							: [chroma, 0, x];

	return rgbToHex([(red + match) * 255, (green + match) * 255, (blue + match) * 255]);
};

function parseRgbPart(value: string) {
	const trimmed = value.trim();
	return trimmed.endsWith('%')
		? clamp((Number(trimmed.slice(0, -1)) / 100) * 255, 0, 255)
		: clamp(Number(trimmed), 0, 255);
}

function parseHuePart(value: string) {
	const trimmed = value.trim().toLowerCase();
	if (trimmed.endsWith('turn')) return Number(trimmed.slice(0, -4)) * 360;
	if (trimmed.endsWith('rad')) return Number(trimmed.slice(0, -3)) * (180 / Math.PI);
	if (trimmed.endsWith('deg')) return Number(trimmed.slice(0, -3));
	return Number(trimmed);
}

const parsePercentPart = (value: string) => Number(value.trim().replace('%', ''));

function parseNcs(input: string) {
	const match = input
		.toUpperCase()
		.replace(/[()]/g, '')
		.replace(/^NCS/, 'NCS ')
		.replace(/\s+/g, ' ')
		.trim()
		.match(/^(?:NCS\s*)?(?:S\s*)?(\d{2})(\d{2})-(N|[YRBG])(\d{2})?([YRBG])?$/);
	if (!match) return null;

	const code = `NCS S ${match[1]}${match[2]}-${match[3]}${match[4] ?? ''}${match[5] ?? ''}`;
	const blackness = Number(match[1]);
	const chromaticness = Number(match[2]);
	const baseColor = match[3];
	const percent = Number(match[4] ?? 0);
	const secondColor = match[5];

	if (blackness > 100 || chromaticness > 100 || blackness + chromaticness > 100) return null;
	if (baseColor === 'N' && (chromaticness !== 0 || secondColor)) return null;
	if (
		baseColor !== 'N' &&
		secondColor &&
		!['YR', 'RB', 'BG', 'GY'].includes(`${baseColor}${secondColor}`)
	) {
		return null;
	}

	if (baseColor === 'N') {
		const grey = clamp(Math.trunc((1 - blackness / 100) * 255), 0, 255);
		return { hex: rgbToHex([grey, grey, grey]), code };
	}

	let red1 = 0;
	let green1 = 0;
	let blue1 = 0;
	let factor1: number;
	const blackLevel = 1.05 * blackness - 5.25;

	if (baseColor === 'Y' && percent <= 60) {
		red1 = 1;
	} else if ((baseColor === 'Y' && percent > 60) || (baseColor === 'R' && percent <= 80)) {
		factor1 = baseColor === 'Y' ? percent - 60 : percent + 40;
		red1 = (Math.sqrt(14884 - factor1 ** 2) - 22) / 100;
	} else if (baseColor === 'G') {
		factor1 = percent - 170;
		red1 = (Math.sqrt(33800 - factor1 ** 2) - 70) / 100;
	}

	if (baseColor === 'Y' && percent <= 80) {
		blue1 = 0;
	} else if ((baseColor === 'Y' && percent > 80) || (baseColor === 'R' && percent <= 60)) {
		factor1 = (baseColor === 'Y' ? percent - 80 : percent + 20) + 20.5;
		blue1 = (104 - Math.sqrt(11236 - factor1 ** 2)) / 100;
	} else if ((baseColor === 'R' && percent > 60) || (baseColor === 'B' && percent <= 80)) {
		factor1 = (baseColor === 'R' ? percent - 60 : percent + 40) - 60;
		blue1 = (Math.sqrt(10000 - factor1 ** 2) - 10) / 100;
	} else if ((baseColor === 'B' && percent > 80) || (baseColor === 'G' && percent <= 40)) {
		factor1 = (baseColor === 'B' ? percent - 80 : percent + 20) - 131;
		blue1 = (122 - Math.sqrt(19881 - factor1 ** 2)) / 100;
	}

	if (baseColor === 'Y') {
		green1 = (85 - (17 / 20) * percent) / 100;
	} else if (baseColor === 'R' && percent > 60) {
		factor1 = percent - 60 + 35;
		green1 = (67.5 - Math.sqrt(5776 - factor1 ** 2)) / 100;
	} else if (baseColor === 'B' && percent <= 60) {
		factor1 = percent - 68.5;
		green1 = (6.5 + Math.sqrt(7044.5 - factor1 ** 2)) / 100;
	} else if ((baseColor === 'B' && percent > 60) || (baseColor === 'G' && percent <= 60)) {
		green1 = 0.9;
	} else if (baseColor === 'G' && percent > 60) {
		green1 = (90 - (percent - 60) / 8) / 100;
	}

	factor1 = (red1 + green1 + blue1) / 3;
	const red2 = ((factor1 - red1) * (100 - chromaticness)) / 100 + red1;
	const green2 = ((factor1 - green1) * (100 - chromaticness)) / 100 + green1;
	const blue2 = ((factor1 - blue1) * (100 - chromaticness)) / 100 + blue1;
	const max = Math.max(red2, green2, blue2);
	if (!Number.isFinite(max) || max <= 0) return null;

	const factor2 = 1 / max;
	const hex = rgbToHex([
		Math.trunc(red2 * factor2 * ((100 - blackLevel) / 100) * 255),
		Math.trunc(green2 * factor2 * ((100 - blackLevel) / 100) * 255),
		Math.trunc(blue2 * factor2 * ((100 - blackLevel) / 100) * 255)
	]);
	return { hex, code };
}

/** Up to two decimals, without trailing zeros. */
/** The arguments of an rgb() or hsl() body, without any trailing `/ alpha`. */
const functionArgs = (body: string) =>
	body
		.replace(/\s*\/\s*[\d.]+%?\s*$/, '')
		.split(/[,\s]+/)
		.filter(Boolean);

const formatNumber = (value: number) => String(Math.round(value * 100) / 100);

/** A typed colour: its hex for rendering and the input in canonical notation, kept so it can be edited as entered. */
type ParsedColor = { hex: string; code: string };

/** Parses hex, rgb(), hsl() or NCS notation, e.g. `ncs s1050-y90r` becomes `NCS S 1050-Y90R`. */
export function normalizeColorInput(input: string): ParsedColor | null {
	const value = input.trim();
	const hexMatch = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (hexMatch) {
		const clean = hexMatch[1].toLowerCase();
		const hex = '#' + (clean.length === 3 ? clean.replace(/./g, '$&$&') : clean);
		return { hex, code: hex.toUpperCase() };
	}

	const rgb = value.match(/^rgba?\((.+)\)$/i);
	if (rgb) {
		const parts = functionArgs(rgb[1]);
		if (parts.length >= 3) {
			const channels = parts.slice(0, 3).map(parseRgbPart);
			if (channels.every(Number.isFinite)) {
				return {
					hex: rgbToHex([channels[0], channels[1], channels[2]]),
					code: `rgb(${channels.map((channel) => Math.round(channel)).join(', ')})`
				};
			}
		}
	}

	const hsl = value.match(/^hsla?\((.+)\)$/i);
	if (hsl) {
		const parts = functionArgs(hsl[1]);
		if (parts.length >= 3) {
			const values = [
				parseHuePart(parts[0]),
				parsePercentPart(parts[1]),
				parsePercentPart(parts[2])
			];
			if (values.every(Number.isFinite)) {
				const [hue, saturation, lightness] = [
					((values[0] % 360) + 360) % 360,
					clamp(values[1], 0, 100),
					clamp(values[2], 0, 100)
				].map(formatNumber);
				return {
					hex: hslToHex(values[0], values[1], values[2]),
					code: `hsl(${hue}, ${saturation}%, ${lightness}%)`
				};
			}
		}
	}

	return parseNcs(value);
}
