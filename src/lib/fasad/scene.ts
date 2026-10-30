import type { PartColors, Scene } from './types.ts';

/** Each part's colour in part order, from `colors`; null for a part left as in the photo. */
export const partHexes = (scene: Scene, colors: PartColors) =>
	scene.parts.map((part) => colors[part.layer] ?? null);

/** The colours of `scene`'s painted parts, without other scenes' parts. */
export const sceneColors = (scene: Scene, colors: PartColors): PartColors =>
	Object.fromEntries(
		scene.parts.flatMap((part) => (part.layer in colors ? [[part.layer, colors[part.layer]]] : []))
	);

/** Whether `colors` paint a part of `scene`: palettes fit the scenes whose part layers they name. */
export const fitsScene = (scene: Scene, colors: PartColors) =>
	scene.parts.some((part) => part.layer in colors);

/** The first scene `colors` fit, which a palette is shown on. */
export const sceneFor = (scenes: Scene[], colors: PartColors) =>
	scenes.find((scene) => fitsScene(scene, colors));

/** The scene with `id`, or the first one, e.g. for a project whose scene was deleted. */
export const findScene = (scenes: Scene[], id: string | null | undefined) =>
	scenes.find((scene) => scene.id === id) ?? scenes[0];

/** Colours masks are shown in while editing them, by part order, as parts have none of their own. */
const MASK_COLORS = [
	'#e6194b',
	'#3cb44b',
	'#4363d8',
	'#f58231',
	'#911eb4',
	'#42d4f4',
	'#f032e6',
	'#bfef45'
];

export const maskColor = (index: number) => MASK_COLORS[index % MASK_COLORS.length];

/** The scenes with `ids`, in that order, skipping deleted ones. */
export const scenesById = (scenes: Scene[], ids: string[]) =>
	ids.flatMap((id) => scenes.find((scene) => scene.id === id) ?? []);

/** Whether a scene can be painted: it has surfaces and each has a mask. */
export const isSceneReady = (scene: { parts: { mask: string | null }[] }) =>
	scene.parts.length > 0 && scene.parts.every((part) => part.mask);
