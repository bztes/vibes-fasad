/** Icons a scene part can show; see `partIcons`. */
export const PART_ICONS = [
	'facade',
	'frame',
	'window',
	'door',
	'roof',
	'wall',
	'trim',
	'paint'
] as const;

export type PartIcon = (typeof PART_ICONS)[number];

/** A paintable region of a scene. */
export type ScenePart = {
	id: string;
	/** Name of the part's mask layer, e.g. "facade"; unique in its scene. Keys its colour, see `PartColors`. */
	layer: string;
	name: string;
	hint: string;
	icon: string;
	/** URL of the mask image, white (or opaque) where the part is; null while it has none, so it isn't painted. */
	mask: string | null;
	/** Share of the photo the part covers, 0…1. */
	area: number;
};

/** Scenes that belong together, e.g. one house from each side. */
export type SceneGroup = { id: string; name: string };

/** One photo to paint, e.g. a house from the front, with its parts. */
export type Scene = {
	id: string;
	/** Null for a scene on its own. */
	groupId: string | null;
	name: string;
	/** URL of the photo. */
	photo: string;
	width: number;
	height: number;
	parts: ScenePart[];
};

/**
 * Hex per part layer, so parts on one layer share a colour across scenes. May hold layers of
 * other scenes, and lack some, whose parts then stay as in the photo.
 */
export type PartColors = Record<string, string>;

/** Mix per part layer, see `Project.recipes`. */
export type PartRecipes = Record<string, MixPart[]>;

/** Colours for the scenes whose part layers it names, see `fitsScene`. */
export type Palette = { id: string; name: string; colors: PartColors };

/** A palette saved in a project, e.g. from the studio's surface colours. */
export type UserPalette = Palette & { createdAt: number };

export type CatalogColor = {
	id: string;
	name: string;
	code: string | null;
	hex: string;
	group: string | null;
};

/** Sorts by name, ignoring case. */
export const byName = (a: { name: string }, b: { name: string }) =>
	a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** The sort order that puts an entry after `rows`. */
export const nextSort = (rows: { sortOrder: number }[]) =>
	Math.max(-1, ...rows.map((row) => row.sortOrder)) + 1;

/** Splits items into groups by `key`, e.g. the catalogue into its colour groups, keeping each group's order. */
/**
 * Every group with its items, even an empty one so it can be edited; items without a group, or
 * with one that's gone, go last under a null group.
 */
export function sectionsByGroup<G extends { id: string }, T extends { groupId: string | null }>(
	groups: G[],
	items: T[]
) {
	const known = new Set(groups.map((group) => group.id));
	const sections: { group: G | null; items: T[] }[] = groups.map((group) => ({
		group,
		items: items.filter((item) => item.groupId === group.id)
	}));
	const rest = items.filter((item) => !item.groupId || !known.has(item.groupId));
	if (rest.length) sections.push({ group: null, items: rest });
	return sections;
}

export function groupBy<T, K>(items: T[], key: (item: T) => K) {
	const groups = new Map<K, T[]>();
	for (const item of items) {
		const group = groups.get(key(item));
		if (group) group.push(item);
		else groups.set(key(item), [item]);
	}
	return [...groups].map(([key, items]) => ({ key, items }));
}

/** Splits the catalogue into its groups, keeping each group's order. */
export function groupColors<T extends { group: string | null }>(colors: T[]) {
	return groupBy(colors, (color) => color.group).map(({ key, items }) => ({
		name: key,
		colors: items
	}));
}

/** A facade design the user works on; edits in the studio are saved to it as they're made. */
export type Project = {
	id: string;
	name: string;
	/** Scenes painted in the project, in tab order; they share `colors`, by part layer. */
	sceneIds: string[];
	colors: PartColors;
	/** How parts were mixed on the bench, by part layer; a part painted otherwise has none. */
	recipes: PartRecipes;
	createdAt: number;
	updatedAt: number;
};

/**
 * A colour as the user entered it: `code` is the normalised input (e.g. `NCS S 1050-Y90R`),
 * kept so it can be edited as typed; `hex` is derived from it for rendering.
 */
export type Color = { name: string; hex: string; code?: string };

/** One colour in a mix, measured in parts like a real tinting recipe. */
export type MixPart = Color & { parts: number };

/** Fine-tuning applied after mixing, each in -100…100. */
export type MixAdjust = { lightness: number; saturation: number; warmth: number };

/** A colour in a project's library, optionally remembering how it was mixed. */
export type SavedColor = {
	id: string;
	name: string;
	hex: string;
	/** Normalised input the colour was entered as; absent on mixes. */
	code?: string;
	recipe: MixPart[];
	createdAt: number;
};

/**
 * What a project key lets its holder do, each also what the ones before it may: look at the
 * project, change it, or also hand out and revoke keys and delete it.
 */
export const ROLES = ['view', 'edit', 'owner'] as const;

export type Role = (typeof ROLES)[number];

/** Whether a key of the role is enough for one of `needed`. */
export const allows = (role: Role, needed: Role) => ROLES.indexOf(role) >= ROLES.indexOf(needed);

/** A project the viewer's account holds a key to, with the key that allows the most. */
export type ProjectSummary = Project & { key: string; role: Role };

/** An open project, with its colour library and palettes. */
export type OpenProject = ProjectSummary & { library: SavedColor[]; palettes: UserPalette[] };

/** One of a project's keys, handed out as a link. */
export type ProjectKey = {
	id: string;
	key: string;
	/** Who it's for; may be empty. */
	label: string;
	role: Role;
	createdAt: number;
};
