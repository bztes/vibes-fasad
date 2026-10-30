import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { ROLES, type MixPart, type PartColors, type PartRecipes } from '#lib/fasad/types.ts';

/**
 * An account, made on first use, e.g. with the first project, without any sign-in; it keeps the
 * keys to its projects. Its devices open it, see `device`. The first one is an admin. Times are
 * in ms.
 */
export const user = sqliteTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	role: text('role', { enum: ['admin', 'user'] })
		.notNull()
		.default('user'),
	createdAt: integer('created_at').notNull(),
	/**
	 * Keyed hash of the account's recovery e-mail, if it has one, see `email.ts`: the address
	 * itself isn't kept, it's only matched when typed in again.
	 */
	emailHash: text('email_hash').unique(),
	/** The recovery e-mail masked, e.g. "n•••@gmail.com", so its owner can tell which it is. */
	emailHint: text('email_hint')
});

/**
 * A browser signed in to an account by a token of its own, which only that browser knows, see
 * `accounts.ts`; removing the device signs it out. Times are in ms.
 */
export const device = sqliteTable(
	'device',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** SHA-256 of the token, see `accounts.ts`. */
		tokenHash: text('token_hash').notNull().unique(),
		/** Browser and system, e.g. "Firefox on Linux", see `deviceName`. */
		name: text('name').notNull(),
		createdAt: integer('created_at').notNull(),
		/** Updated at most hourly, see `touch`. */
		lastSeenAt: integer('last_seen_at').notNull()
	},
	(table) => [index('device_user').on(table.userId)]
);

/**
 * A link that adds a device to an account: it works once, for a short while, see `createPairing`.
 * Times are in ms.
 */
export const pairing = sqliteTable('pairing', {
	/** SHA-256 of the code in the link. */
	codeHash: text('code_hash').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull()
});

/**
 * A recovery e-mail waiting to be confirmed by the link sent to it, see `requestEmail`; it works
 * once, for a short while. Times are in ms.
 */
export const emailConfirmation = sqliteTable('email_confirmation', {
	/** SHA-256 of the code in the link. */
	codeHash: text('code_hash').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	emailHash: text('email_hash').notNull(),
	emailHint: text('email_hint').notNull(),
	expiresAt: integer('expires_at').notNull()
});

/** Scenes that belong together, e.g. photos of one house from each side; managed in /admin/scenes. */
export const sceneGroup = sqliteTable('scene_group', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
});

/**
 * One photo to paint, e.g. a house from the front, with its parts; managed in /admin/scenes.
 * The photo itself is a WebP file on disk, see `photos.ts`.
 */
export const scene = sqliteTable('scene', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	/** Null for a scene on its own. */
	groupId: text('group_id').references(() => sceneGroup.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	/** Changes with the photo, so its URL can be cached for good. */
	photoVersion: integer('photo_version')
		.notNull()
		.$defaultFn(() => Date.now()),
	sortOrder: integer('sort_order').notNull().default(0)
});

/**
 * A paintable region of a scene, e.g. the facade, outlined by its mask: a WebP on disk (see
 * `photos.ts`) stretched over the photo, so it survives a new photo of the same framing.
 */
export const scenePart = sqliteTable(
	'scene_part',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		sceneId: text('scene_id')
			.notNull()
			.references(() => scene.id, { onDelete: 'cascade' }),
		/**
		 * Name of the part's mask layer in OpenRaster files, e.g. "facade". Colours in projects and
		 * palettes are kept per layer, so parts on one layer share theirs across scenes.
		 */
		layer: text('layer').notNull(),
		name: text('name').notNull(),
		/** What the part covers, e.g. "Outer casing and sill". */
		hint: text('hint').notNull().default(''),
		/** Key of `partIcons`. */
		icon: text('icon').notNull().default('paint'),
		sortOrder: integer('sort_order').notNull().default(0),
		/** Changes with the mask, so its URL can be cached for good; null while it has none. */
		maskVersion: integer('mask_version'),
		/** Share of the photo the mask marks, 0…1. */
		coverage: real('coverage').notNull().default(0)
	},
	(table) => [uniqueIndex('scene_part_layer').on(table.sceneId, table.layer)]
);

/** Group of template palettes, e.g. "Swedish classics"; the library groups by it. */
export const paletteGroup = sqliteTable('palette_group', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique(),
	sortOrder: integer('sort_order').notNull().default(0)
});

/**
 * Palettes: templates, without a project, are curated in /admin/palettes and shown as "predefined"
 * in the studio; the others were saved in a project from its surface colours. A palette fits the
 * scenes whose part layers it names, see `fitsScene`.
 */
export const palette = sqliteTable(
	'palette',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		/** Null for templates. */
		projectId: text('project_id').references(() => project.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Templates only; null for one outside any group. */
		groupId: text('group_id').references(() => paletteGroup.id, { onDelete: 'set null' }),
		/** Hex per part layer, of any scenes; parts it leaves out stay as in the photo. */
		colors: text('colors', { mode: 'json' }).$type<PartColors>().notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		/** In ms; project palettes are listed newest first. */
		createdAt: integer('created_at').notNull().default(0)
	},
	(table) => [index('palette_project').on(table.projectId)]
);

/** Group of catalogue colours, e.g. the product line "Ottosson Linoljefärg"; the catalogue groups by it. */
export const colorGroup = sqliteTable('color_group', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull().unique(),
	sortOrder: integer('sort_order').notNull().default(0)
});

/**
 * Catalogue of colours offered in the colour picker, managed in /admin/colors. */
export const catalogColor = sqliteTable('catalog_color', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	/** The manufacturer's own name, e.g. Swedish for Ottosson. */
	name: text('name').notNull(),
	/** Optional manufacturer or NCS code, shown next to the name. */
	code: text('code'),
	groupId: text('group_id').references(() => colorGroup.id, { onDelete: 'set null' }),
	hex: text('hex').notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
});

/**
 * A facade design from the studio; anyone with its link may look at it, but only holders of one
 * of its `project_key`s may change it. Edited through `projects.remote.ts`, with its colours and
 * palettes. Times are in ms.
 */
export const project = sqliteTable('project', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	/** In tab order. No foreign key: deleted scenes are skipped, see `scenesById`. */
	sceneIds: text('scene_ids', { mode: 'json' }).$type<string[]>().notNull(),
	colors: text('colors', { mode: 'json' }).$type<PartColors>().notNull(),
	recipes: text('recipes', { mode: 'json' }).$type<PartRecipes>().notNull().default({}),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

/** A colour saved in a project's library, with how it was mixed. */
export const projectColor = sqliteTable(
	'project_color',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		hex: text('hex').notNull(),
		/** The input the colour was entered as, e.g. an NCS code. */
		code: text('code'),
		/** Colours in parts; empty for a colour that wasn't mixed. */
		recipe: text('recipe', { mode: 'json' }).$type<MixPart[]>().notNull(),
		createdAt: integer('created_at').notNull()
	},
	(table) => [index('project_color_project').on(table.projectId)]
);

/**
 * Opens its project to whoever holds it, as far as its role allows; handed out as a link. The
 * first, an owner's, comes with the project from the browser that created it; owners hand out
 * and revoke the others.
 */
export const projectKey = sqliteTable(
	'project_key',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		/** The secret in the link, see `newKey`. */
		key: text('key').notNull().unique(),
		/** Who it's for, e.g. "Anna"; empty for the project's first. */
		label: text('label').notNull().default(''),
		role: text('role', { enum: ROLES }).notNull(),
		createdAt: integer('created_at').notNull()
	},
	(table) => [index('project_key_project').on(table.projectId)]
);

/** Project keys kept in a user's account, so their projects follow them to other devices. */
export const userProjectKey = sqliteTable(
	'user_project_key',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		keyId: text('key_id')
			.notNull()
			.references(() => projectKey.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.userId, table.keyId] })]
);
