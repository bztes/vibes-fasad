import { describe, expect, it } from 'vitest';
import { isOra, readOra, writeOra } from './openraster.ts';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('openraster', () => {
	it('reads back what it writes, top layer first', () => {
		const file = writeOra({
			width: 4,
			height: 3,
			layers: [
				{ name: 'Trim & "sill" <1>', png: bytes(1), x: 2, y: 1, opacity: 0.5 },
				{ name: 'Photo', png: bytes(2, 3) }
			],
			merged: bytes(4),
			thumbnail: bytes(5)
		});
		expect(isOra(file)).toBe(true);
		expect(readOra(file)).toEqual({
			width: 4,
			height: 3,
			layers: [
				{ name: 'Trim & "sill" <1>', png: bytes(1), x: 2, y: 1, opacity: 0.5 },
				{ name: 'Photo', png: bytes(2, 3), x: 0, y: 0, opacity: 1 }
			]
		});
	});

	it('turns away other files', () => {
		expect(isOra(bytes(0x89, 0x50, 0x4e, 0x47))).toBe(false);
		expect(readOra(bytes(1, 2, 3))).toBeUndefined();
	});
});
