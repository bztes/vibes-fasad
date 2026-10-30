import { describe, expect, it } from 'vitest';
import { normalizeColorInput } from './color-input.ts';

const parseColorInput = (input: string) => normalizeColorInput(input)?.hex ?? null;

describe('parseColorInput', () => {
	it.each([
		['#abc', '#aabbcc'],
		['56745d', '#56745d'],
		['rgb(255, 0, 128)', '#ff0080'],
		['rgb(100% 0% 50%)', '#ff0080'],
		['hsl(0 100% 50%)', '#ff0000'],
		['NCS S 0500-N', '#f2f2f2']
	])('normalizes %s', (input, expected) => {
		expect(parseColorInput(input)).toBe(expected);
	});

	it('converts a chromatic NCS notation', () => {
		expect(parseColorInput('NCS S 4020-G10Y')).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('rejects unsupported values', () => {
		expect(parseColorInput('greenish')).toBeNull();
		expect(parseColorInput('rgb(nope, 0, 0)')).toBeNull();
	});
});

describe('normalizeColorInput', () => {
	it.each([
		['#abc', '#AABBCC'],
		['rgb(100% 0% 50%)', 'rgb(255, 0, 128)'],
		['hsla(-90deg 120% 50% / 0.5)', 'hsl(270, 100%, 50%)'],
		['ncs s1050-y90r', 'NCS S 1050-Y90R'],
		['S 0500-N', 'NCS S 0500-N']
	])('keeps %s as %s', (input, code) => {
		expect(normalizeColorInput(input)?.code).toBe(code);
	});

	it('derives the same hex as parseColorInput', () => {
		expect(normalizeColorInput('NCS S 4020-G10Y')?.hex).toBe(parseColorInput('NCS S 4020-G10Y'));
	});
});
