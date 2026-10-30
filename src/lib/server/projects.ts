import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { newKey } from '#lib/fasad/keys.ts';
import {
	ROLES,
	type MixPart,
	type PartColors,
	type Project,
	type ProjectKey,
	type ProjectSummary,
	type Role
} from '#lib/fasad/types.ts';
import { db } from '#lib/server/db/index.ts';
import {
	palette,
	project,
	projectColor,
	projectKey,
	userProjectKey
} from '#lib/server/db/schema.ts';

/** Of several keys to one project, the one that allows the most. */
function best<T extends { role: Role }>(a: T | undefined, b: T) {
	return a && ROLES.indexOf(a.role) >= ROLES.indexOf(b.role) ? a : b;
}

/** The projects the user's account keeps keys to, each with the one that allows the most, last edited first. */
export async function heldProjects(userId: string): Promise<ProjectSummary[]> {
	const access: Record<string, { key: string; role: Role }> = {};
	for (const row of await accountKeys(userId)) {
		access[row.projectId] = best(access[row.projectId], row);
	}
	const ids = Object.keys(access);
	if (!ids.length) return [];
	const rows = await db
		.select()
		.from(project)
		.where(inArray(project.id, ids))
		.orderBy(desc(project.updatedAt));
	return rows.map((row) => ({ ...row, key: access[row.id].key, role: access[row.id].role }));
}

/** The project with its colours, oldest first, and palettes, newest first. */
export async function loadProject(id: string) {
	const [[row], library, palettes] = await Promise.all([
		db.select().from(project).where(eq(project.id, id)),
		db
			.select()
			.from(projectColor)
			.where(eq(projectColor.projectId, id))
			.orderBy(asc(projectColor.createdAt)),
		db.select().from(palette).where(eq(palette.projectId, id)).orderBy(desc(palette.createdAt))
	]);
	if (!row) return undefined;
	return {
		...row,
		library: library.map(({ id, name, hex, code, recipe, createdAt }) => ({
			id,
			name,
			hex,
			...(code && { code }),
			recipe,
			createdAt
		})),
		palettes: palettes.map(({ id, name, colors, createdAt }) => ({ id, name, colors, createdAt }))
	};
}

/** The key, if it opens the project. */
export async function findKey(projectId: string, key: string) {
	const [row] = await db
		.select()
		.from(projectKey)
		.where(and(eq(projectKey.projectId, projectId), eq(projectKey.key, key)));
	return row;
}

/** The keys kept in the user's account. */
async function accountKeys(userId: string) {
	return db
		.select({
			id: projectKey.id,
			projectId: projectKey.projectId,
			key: projectKey.key,
			role: projectKey.role
		})
		.from(userProjectKey)
		.innerJoin(projectKey, eq(userProjectKey.keyId, projectKey.id))
		.where(eq(userProjectKey.userId, userId));
}

/** Keeps the keys in the user's account. */
export async function claimKeys(userId: string, keyIds: string[]) {
	if (!keyIds.length) return;
	await db
		.insert(userProjectKey)
		.values(keyIds.map((keyId) => ({ userId, keyId })))
		.onConflictDoNothing();
}

/** Takes the project's keys out of the user's account; the keys themselves still work. */
export async function forgetProject(userId: string, projectId: string) {
	const keys = db
		.select({ id: projectKey.id })
		.from(projectKey)
		.where(eq(projectKey.projectId, projectId));
	await db
		.delete(userProjectKey)
		.where(and(eq(userProjectKey.userId, userId), inArray(userProjectKey.keyId, keys)));
}

/** Creates a project with its first key, an owner's, which it returns with the project's id. */
export async function createProject(
	data: Pick<Project, 'name' | 'sceneIds' | 'colors'> & Partial<Pick<Project, 'recipes'>>
) {
	const now = Date.now();
	const id = crypto.randomUUID();
	const key = newKey();
	const [{ id: keyId }] = await db.transaction(async (tx) => {
		await tx.insert(project).values({ ...data, id, createdAt: now, updatedAt: now });
		return tx
			.insert(projectKey)
			.values({ projectId: id, key, role: 'owner', createdAt: now })
			.returning({ id: projectKey.id });
	});
	return { id, key, keyId };
}

/** Marks the project as edited, along with `changes` to it. */
export async function updateProject(
	id: string,
	changes: Partial<Pick<Project, 'name' | 'sceneIds' | 'colors' | 'recipes'>> = {}
) {
	await db
		.update(project)
		.set({ ...changes, updatedAt: Date.now() })
		.where(eq(project.id, id));
}

/** A new project, ours to edit, with the project's scenes, colours, saved colours and palettes. */
export async function duplicateProject(id: string, name: string) {
	const source = await loadProject(id);
	if (!source) return undefined;
	const { sceneIds, colors, recipes } = source;
	const copy = await createProject({ name, sceneIds, colors, recipes });
	if (source.library.length) {
		await db.insert(projectColor).values(
			source.library.map((color) => ({
				...color,
				id: crypto.randomUUID(),
				projectId: copy.id
			}))
		);
	}
	if (source.palettes.length) {
		await db.insert(palette).values(
			source.palettes.map((entry) => ({
				...entry,
				id: crypto.randomUUID(),
				projectId: copy.id
			}))
		);
	}
	return copy;
}

/** Adds a colour to the project's library, or replaces the one with `colorId`; returns its id. */
export async function saveColor(
	projectId: string,
	colorId: string | undefined,
	color: { name: string; hex: string; code?: string; recipe: MixPart[] }
) {
	const row = { ...color, code: color.code ?? null };
	if (colorId) {
		await db
			.update(projectColor)
			.set(row)
			.where(and(eq(projectColor.id, colorId), eq(projectColor.projectId, projectId)));
	} else {
		colorId = crypto.randomUUID();
		await db.insert(projectColor).values({ ...row, id: colorId, projectId, createdAt: Date.now() });
	}
	await updateProject(projectId);
	return colorId;
}

export async function deleteColor(projectId: string, colorId: string) {
	await db
		.delete(projectColor)
		.where(and(eq(projectColor.id, colorId), eq(projectColor.projectId, projectId)));
	await updateProject(projectId);
}

/** Adds a palette to the project, or replaces the one with `paletteId`; returns its id. */
export async function savePalette(
	projectId: string,
	paletteId: string | undefined,
	data: { name: string; colors: PartColors }
) {
	if (paletteId) {
		await db
			.update(palette)
			.set(data)
			.where(and(eq(palette.id, paletteId), eq(palette.projectId, projectId)));
	} else {
		paletteId = crypto.randomUUID();
		await db.insert(palette).values({ ...data, id: paletteId, projectId, createdAt: Date.now() });
	}
	await updateProject(projectId);
	return paletteId;
}

export async function deletePalette(projectId: string, paletteId: string) {
	await db.delete(palette).where(and(eq(palette.id, paletteId), eq(palette.projectId, projectId)));
	await updateProject(projectId);
}

/** Deletes the project; its keys, colours and palettes go with it by the schema's cascades. */
export async function deleteProject(id: string) {
	await db.delete(project).where(eq(project.id, id));
}

const toProjectKey = ({
	id,
	key,
	label,
	role,
	createdAt
}: typeof projectKey.$inferSelect): ProjectKey => ({ id, key, label, role, createdAt });

/** The project's keys, oldest first. */
export async function listKeys(projectId: string) {
	const rows = await db
		.select()
		.from(projectKey)
		.where(eq(projectKey.projectId, projectId))
		.orderBy(asc(projectKey.createdAt));
	return rows.map(toProjectKey);
}

export async function createKey(projectId: string, label: string, role: Role) {
	const [row] = await db
		.insert(projectKey)
		.values({ projectId, key: newKey(), label, role, createdAt: Date.now() })
		.returning();
	return toProjectKey(row);
}

/** Its link stops working, also for accounts that kept it. */
export async function revokeKey(projectId: string, keyId: string) {
	await db.transaction(async (tx) => {
		const [row] = await tx
			.select({ id: projectKey.id })
			.from(projectKey)
			.where(and(eq(projectKey.id, keyId), eq(projectKey.projectId, projectId)));
		if (!row) return;
		await tx.delete(userProjectKey).where(eq(userProjectKey.keyId, keyId));
		await tx.delete(projectKey).where(eq(projectKey.id, keyId));
	});
}
