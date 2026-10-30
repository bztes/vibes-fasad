import type { RemoteQueryUpdate } from '$app/server';
import { createContext } from 'svelte';
import { getViewer } from '#lib/account.remote.ts';
import { getProject, getProjects } from './projects.remote.ts';
import type { OpenProject, ProjectSummary } from './types.ts';

/** The projects of the viewer's account, last edited first. */
export const listProjects = () => getProjects();

/**
 * Shows the account a command made on first use, keeping a project in it, e.g. `createProject`;
 * the browser is signed in to it from now on.
 */
export function noticeAccount<T extends { newAccount: boolean }>(result: T) {
	if (result.newAccount) void getViewer().refresh();
	return result;
}

/** The argument of the project's queries and commands. */
export const access = ({ id, key }: ProjectSummary) => ({ id, key });

/**
 * Sends `pending`, a command editing the project, showing `change` on the project right away.
 * The command sends the project and the project list back with its result.
 */
export function edit<T>(
	project: ProjectSummary,
	pending: { updates(...updates: RemoteQueryUpdate[]): Promise<T> },
	change?: (project: OpenProject) => OpenProject
) {
	const query = getProject(access(project));
	return pending.updates(change ? query.withOverride(change) : query, getProjects);
}

/** The project shown at `/[id]`, loaded by its layout, for the pages below it. */
export const [getOpenProject, setOpenProject] = createContext<() => OpenProject>();

/** The project last opened, or picked to save into, see `Nav.project`. */
let chosen = $state<string>();

export const chosenProject = () => chosen;

export function chooseProject(id: string) {
	chosen = id;
}

/**
 * Every held project, opened, for the library, mixer and palette editor, which span them all;
 * loaded by their layout.
 */
export const [getHeldProjects, setHeldProjects] = createContext<() => OpenProject[]>();

/** The saved colours of all the projects, each hex once, e.g. to mix from. */
export const savedColors = (projects: OpenProject[]) =>
	Object.values(
		Object.fromEntries(
			projects.flatMap((project) => project.library).map((color) => [color.hex, color])
		)
	);
