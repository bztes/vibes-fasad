import { describe, expect, it } from 'vitest';
import { NO_ADJUST, adjust, hexToRgb, isLight, lightness, mixColors, rgbToHex } from './color.ts';

describe('color', () => {
	it('round-trips hex colours', () => {
		expect(hexToRgb('#8f2f2b')).toEqual([143, 47, 43]);
		expect(rgbToHex([143, 47, 43])).toBe('#8f2f2b');
	});

	it('mixes like pigments', () => {
		expect(mixColors([])).toBeNull();
		expect(mixColors([{ hex: '#8f2f2b', parts: 3 }])).toBe('#8f2f2b');
		expect(
			mixColors([
				{ hex: '#ffffff', parts: 1 },
				{ hex: '#ffffff', parts: 5 }
			])
		).toBe('#ffffff');

		// A little black darkens far more than its share of the mix.
		const shaded = mixColors([
			{ hex: '#ffffff', parts: 9 },
			{ hex: '#000000', parts: 1 }
		])!;
		expect(lightness(shaded)).toBeLessThan(0.75);

		// Yellow and blue lean green.
		const [r, g, b] = hexToRgb(
			mixColors([
				{ hex: '#f2d21b', parts: 1 },
				{ hex: '#1b4fa8', parts: 1 }
			])!
		);
		expect(g).toBeGreaterThan(r);
		expect(g).toBeGreaterThan(b);
	});

	it('adjusts lightness and warmth', () => {
		expect(adjust('#777a75', NO_ADJUST)).toBe('#777a75');
		expect(lightness(adjust('#777a75', { ...NO_ADJUST, lightness: 50 }))).toBeGreaterThan(
			lightness('#777a75')
		);
		const [r, , b] = hexToRgb(adjust('#777777', { ...NO_ADJUST, warmth: 100 }));
		expect(r).toBeGreaterThan(b);
		expect(isLight('#f8f8f4')).toBe(true);
		expect(isLight('#405744')).toBe(false);
	});
});
