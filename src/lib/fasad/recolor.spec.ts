import { describe, expect, it } from 'vitest';
import { buildLayers, paintLayers, recolor } from './recolor.ts';

function image(pixels: number[][]) {
	return {
		width: pixels.length,
		height: 1,
		data: new Uint8ClampedArray(pixels.flatMap(([r, g, b]) => [r, g, b, 255]))
	} as ImageData;
}

globalThis.ImageData ??= class {
	constructor(
		public data: Uint8ClampedArray,
		public width: number,
		public height: number
	) {}
} as unknown as typeof ImageData;

describe('recolor', () => {
	it('assigns each pixel to its strongest mask and leaves unmasked pixels untouched', () => {
		const source = image([
			[200, 200, 200],
			[200, 200, 200],
			[10, 20, 30]
		]);
		const masks = [
			image([
				[255, 255, 255],
				[0, 0, 0],
				[0, 0, 0]
			]),
			image([
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
			]),
			image([
				[0, 0, 0],
				[255, 255, 255],
				[0, 0, 0]
			])
		];
		const layers = buildLayers(source, masks);
		expect([...layers.layer.slice(0, 2)]).toEqual([0, 2]);

		const out = recolor(layers, ['#ff0000', '#00ff00', '#0000ff']).data;
		expect(out[0]).toBeGreaterThan(out[1]); // first part's pixel turns red
		expect(out[6]).toBeGreaterThan(out[4]); // third part's pixel turns blue
		expect([...out.slice(8, 11)]).toEqual([10, 20, 30]);
	});

	it('gives overlapping masks to the later part and reads opacity', () => {
		const source = image([
			[200, 200, 200],
			[200, 200, 200]
		]);
		const below = image([
			[255, 255, 255],
			[255, 255, 255]
		]);
		const above = image([
			[255, 255, 255],
			[255, 255, 255]
		]);
		above.data[7] = 0; // second pixel transparent
		const layers = buildLayers(source, [below, above]);
		expect([...layers.layer]).toEqual([1, 0]);
		expect([...layers.alpha]).toEqual([1, 1]);
	});

	it('leaves the photo alone without masks', () => {
		const source = image([[10, 20, 30]]);
		expect([...recolor(buildLayers(source, []), []).data.slice(0, 3)]).toEqual([10, 20, 30]);
	});

	it('keeps the colour’s own lightness on a dark part, shading it like the photo', () => {
		const source = image([
			[143, 47, 43],
			[143, 47, 43],
			[72, 24, 22]
		]);
		const mask = image([
			[255, 255, 255],
			[255, 255, 255],
			[255, 255, 255]
		]);
		const out = recolor(buildLayers(source, [mask]), ['#e9e1cf']).data;
		expect([...out.slice(0, 3)]).toEqual([233, 225, 207]); // plain wall shows the colour as is
		expect(out[8]).toBeLessThan(out[0]); // the shadow stays darker
		expect(out[8]).toBeGreaterThan(100);
	});

	it('keeps a part that sits in shade darker than the colour', () => {
		const source = image([
			[77, 77, 62],
			[77, 77, 62]
		]);
		const mask = image([
			[255, 255, 255],
			[255, 255, 255]
		]);
		const out = recolor(buildLayers(source, [mask]), ['#8e402d']).data;
		expect(out[0]).toBeLessThan(0x8e);
		expect(out[0]).toBeGreaterThan(70);
	});

	it('paints each part on its own transparent layer', () => {
		const source = image([
			[200, 200, 200],
			[200, 200, 200]
		]);
		const first = image([
			[255, 255, 255],
			[0, 0, 0]
		]);
		const second = image([
			[0, 0, 0],
			[255, 255, 255]
		]);
		const [one, two] = paintLayers(buildLayers(source, [first, second]), ['#ff0000', '#0000ff']);
		expect([...one.data.slice(0, 8)]).toEqual([255, 0, 0, 255, 0, 0, 0, 0]);
		expect([...two.data.slice(4, 8)]).toEqual([0, 0, 255, 255]);
	});
});
