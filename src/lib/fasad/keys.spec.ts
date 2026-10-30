import { describe, expect, it } from 'vitest';
import { isKey, newKey } from './keys.ts';

describe('newKey', () => {
	it('makes distinct keys that pass as keys', () => {
		const keys = new Set(Array.from({ length: 100 }, newKey));
		expect(keys.size).toBe(100);
		expect([...keys].every(isKey)).toBe(true);
		expect(isKey('not a key')).toBe(false);
	});
});
