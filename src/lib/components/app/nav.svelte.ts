import { resolve } from '$app/paths';
import { page } from '$app/state';
import type { ResolvedPathname } from '$app/types';
import { AMBIENT_COLORS } from '#lib/fasad/defaults.ts';
import { chooseProject, chosenProject } from '#lib/fasad/project.svelte.ts';
import { sceneColors, scenesById } from '#lib/fasad/scene.ts';
import { allows, type ProjectSummary, type Scene } from '#lib/fasad/types.ts';
import { FlaskConical, House, Palette, SwatchBook } from '@lucide/svelte';
import { createContext } from 'svelte';
import { logoIcon } from './logo.ts';

/** Who is looking, see `getViewer`. */
export type Viewer = { isAdmin: boolean; user: { id: string } | null; navCollapsed: boolean };

/** Remembers whether the desktop sidebar is collapsed, as `collapsed` or `open`. */
export const NAV_COOKIE = 'nav';

const LINKS = [
	{ href: '/', label: 'Studio', icon: House },
	{ href: '/library', label: 'Library', icon: SwatchBook },
	{ href: '/mixer', label: 'Mixer', icon: FlaskConical },
	{ href: '/palette', label: 'Palette', icon: Palette }
];

/** The app's navigation: a sidebar on desktop that collapses to an icon rail. */
export class Nav {
	/** Once toggled; until then as the viewer left it. */
	#collapsed = $state<boolean>();

	get collapsed() {
		return this.#collapsed ?? this.viewer().navCollapsed;
	}

	/** The project last opened or picked to save into, or else the last edited; none until there is one. */
	get project() {
		const projects = this.projects();
		return projects.find((project) => project.id === chosenProject()) ?? projects[0];
	}

	/** The projects that may be changed, which the library, mixer and palette editor save into. */
	get editable() {
		return this.projects().filter((project) => allows(project.role, 'edit'));
	}

	/** Where new colours and palettes are saved: the current project, if it may be changed. */
	get target() {
		const project = this.project;
		return project && allows(project.role, 'edit') ? project : this.editable[0];
	}

	set target(project: ProjectSummary | undefined) {
		if (project) chooseProject(project.id);
	}

	/** The project's first scene, as shown on its card; none until a scene is added. */
	get scene(): Scene | undefined {
		const project = this.project;
		return (project && scenesById(this.scenes(), project.sceneIds)[0]) ?? this.scenes()[0];
	}

	/** The project's colours on its first scene, or the ambient ones before any; they tint the app's logo and background. */
	get colors() {
		const scene = this.scene;
		const colors = scene ? Object.values(sceneColors(scene, this.project?.colors ?? {})) : [];
		return colors.length ? colors : AMBIENT_COLORS;
	}

	/** The logo for the browser tab, in the project's colours. */
	get favicon() {
		return logoIcon(this.colors);
	}

	readonly links = LINKS;
	/** The phone's tab bar has room for three. */
	readonly tabs = LINKS.slice(0, 3);

	constructor(
		private viewer: () => Viewer,
		private projects: () => ProjectSummary[],
		private scenes: () => Scene[]
	) {}

	get isAdmin() {
		return this.viewer().isAdmin;
	}

	/** Whether the browser has an account yet, made with its first project. */
	get hasAccount() {
		return !!this.viewer().user;
	}

	toggle() {
		this.#collapsed = !this.collapsed;
		document.cookie = `${NAV_COOKIE}=${this.#collapsed ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`;
	}

	/** A section is current at its own address and below it; the studio also while a project is open. */
	isCurrent(path: string) {
		if (path === '/') return page.route.id === '/(app)' || page.route.id === '/(app)/[id=uuid]';
		return isUnder(page.url.pathname, path);
	}
}

/** Whether `pathname` is `path` or an address below it. */
export const isUnder = (pathname: string, path: string) =>
	pathname === path || pathname.startsWith(`${path}/`);

/**
 * For addresses built at runtime, which `resolve` can only check as a union it has no overload
 * for. Typed as resolved, so the linter's `no-navigation-without-resolve` knows it is.
 */
export const href = resolve as (path: string) => ResolvedPathname;

export const [getNav, setNav] = createContext<Nav>();
