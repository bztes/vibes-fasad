import { fitsScene } from '#lib/fasad/scene.ts';
import type { PartColors, Scene } from '#lib/fasad/types.ts';
import { createContext } from 'svelte';

/** The library's search, kept by its layout so it carries over between its tabs. */
export class LibrarySearch {
	query = $state('');

	/** Whether any of the texts contains the query, ignoring case. */
	matches = (...texts: (string | null)[]) =>
		texts.join(' ').toLowerCase().includes(this.query.trim().toLowerCase());

	/** The palettes matching the search, grouped under the scene they fit, for scenes that have any. */
	byScene<T extends { name: string; colors: PartColors }>(scenes: Scene[], palettes: T[]) {
		return scenes
			.map((scene) => ({
				scene,
				palettes: palettes.filter(
					(palette) => fitsScene(scene, palette.colors) && this.matches(palette.name)
				)
			}))
			.filter((group) => group.palettes.length);
	}
}

export const [getLibrarySearch, setLibrarySearch] = createContext<LibrarySearch>();
