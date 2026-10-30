<script lang="ts">
	import { goto } from '$app/navigation';
	import { href } from '#lib/components/app/nav.svelte.ts';
	import HouseThumb from '#lib/components/fasad/HouseThumb.svelte';
	import NewProject from '#lib/components/fasad/NewProject.svelte';
	import PaletteStrip from '#lib/components/fasad/PaletteStrip.svelte';
	import ShareDialog from '#lib/components/fasad/ShareDialog.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import ConfirmDelete from '#lib/components/ui/ConfirmDelete.svelte';
	import NameDialog from '#lib/components/ui/NameDialog.svelte';
	import Swatches from '#lib/components/ui/Swatches.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { timeAgo } from '#lib/fasad/format.ts';
	import { access, noticeAccount, listProjects } from '#lib/fasad/project.svelte.ts';
	import {
		createProject,
		deleteProject,
		duplicateProject,
		forgetProject,
		updateProject
	} from '#lib/fasad/projects.remote.ts';
	import { fitsScene, partHexes, scenesById } from '#lib/fasad/scene.ts';
	import { allows, type Project, type ProjectSummary } from '#lib/fasad/types.ts';
	import { CopyPlus, Eye, FolderKanban, HousePlus, Layers, Pencil, Share2 } from '@lucide/svelte';

	let [{ presets, groups, scenes }, projects] = $derived(
		await Promise.all([getCatalog(), listProjects()])
	);

	type Start = Pick<Project, 'sceneIds' | 'colors'>;
	let renaming = $state<ProjectSummary | null>(null);
	let duplicating = $state<ProjectSummary | null>(null);
	let sharing = $state<ProjectSummary | null>(null);

	/** The project's page opens it. */
	const open = (id: string) => goto(href(`/${id}`));

	/** The first project also makes the viewer's account, see `noticeAccount`. */
	async function create(project: Start & { name: string }) {
		const created = noticeAccount(await createProject(project));
		open(created.id);
	}

	// Palettes grouped under their scene, for scenes that have any.
	let presetGroups = $derived(
		scenes
			.map((scene) => ({
				scene,
				presets: presets.filter((preset) => fitsScene(scene, preset.colors))
			}))
			.filter((group) => group.presets.length)
	);

	function rename(project: ProjectSummary, name: string) {
		updateProject({ ...access(project), name }).updates(
			listProjects().withOverride((list) =>
				list.map((other) => (other.id === project.id ? { ...other, name } : other))
			)
		);
	}

	async function duplicate(project: ProjectSummary, name: string) {
		noticeAccount(await duplicateProject({ ...access(project), name }));
	}

	/** Deletes a project we own for everyone; others' are just taken off the list. */
	async function remove(project: ProjectSummary) {
		const command = project.role === 'owner' ? deleteProject : forgetProject;
		await command(access(project)).updates(listProjects());
	}
</script>

<svelte:head>
	<title>Projects · Fasad</title>
</svelte:head>

<main class="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase">Projects</p>
			<h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Projects</h1>
			<p class="mt-2 max-w-2xl text-sm text-white/55">
				Each project keeps a full facade colour scheme. Changes in the studio save automatically to
				the open project. A project's link decides what you can do with it: look at it, change it,
				or also share it.
			</p>
		</div>
		<NewProject {scenes} {groups} />
	</header>

	{#if projects.length}
		<div class="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-5">
			{#each projects as project (project.id)}
				{@const shown = scenesById(scenes, project.sceneIds)}
				{@const scene = shown[0] ?? scenes[0]}
				{@const editable = allows(project.role, 'edit')}
				{@const owner = project.role === 'owner'}
				<article
					class="group flex animate-rise flex-col rounded-3xl glass p-2 transition hover:border-white/20"
				>
					<button
						class="relative block overflow-hidden rounded-[1.1rem]"
						aria-label="Open {project.name}"
						onclick={() => open(project.id)}
					>
						<HouseThumb
							{scene}
							colors={project.colors}
							class="h-56 w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
						/>
						<span
							class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-night-950/70 to-transparent"
						></span>
						<span class="absolute bottom-2.5 left-3"
							><Swatches colors={partHexes(scene, project.colors)} /></span
						>
						{#if shown.length > 1}
							<span
								class="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full glass-strong px-2 py-1 text-[10px] font-semibold text-white/80"
								title="{shown.length} scenes"
							>
								<Layers class="size-3" />
								{shown.length}
							</span>
						{/if}
						{#if !editable}
							<span
								class="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full glass-strong px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white/70 uppercase"
							>
								<Eye class="size-3" />
								View only
							</span>
						{/if}
					</button>
					<div class="px-1.5 pt-3 pb-1">
						<h2 class="truncate text-sm font-semibold" title={project.name}>{project.name}</h2>
						<p class="text-[11px] text-white/45">
							Edited {timeAgo(project.updatedAt)}
						</p>
						<div class="mt-2 flex items-center gap-0.5">
							<Button size="sm" variant="primary" onclick={() => open(project.id)}>Open</Button>
							{#if editable}
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Rename"
									title="Rename"
									onclick={() => (renaming = project)}
								>
									<Pencil class="size-4" />
								</Button>
							{/if}
							{#if owner}
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Share"
									title="Share"
									onclick={() => (sharing = project)}
								>
									<Share2 class="size-4" />
								</Button>
							{/if}
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Duplicate"
								title="Duplicate"
								onclick={() => (duplicating = project)}
							>
								<CopyPlus class="size-4" />
							</Button>
							<span class="ml-auto">
								<!-- Others' projects are only taken off the list. -->
								<ConfirmDelete
									label={owner ? `Delete ${project.name}` : `Remove ${project.name} from the list`}
									ondelete={() => remove(project)}
								/>
							</span>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center rounded-3xl glass px-6 py-14 text-center">
			<FolderKanban class="mb-3 size-9 text-white/30" />
			<p class="font-medium">No projects yet</p>
			<p class="mt-1 max-w-sm text-sm text-white/55">
				Create a project to start painting, or start from one of the palettes below.
			</p>
			<NewProject class="mt-5" {scenes} {groups} />
		</div>
	{/if}

	{#if presetGroups.length}
		<section class="mt-10">
			<h2 class="text-sm font-semibold">Start from a palette</h2>
			<p class="mb-3 text-xs text-white/50">Creates a new project with these colours.</p>
			{#each presetGroups as { scene, presets } (scene.id)}
				{#if scenes.length > 1}
					<h3 class="mt-5 mb-2 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
						{scene.name}
					</h3>
				{/if}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					{#each presets as preset (preset.id)}
						<button
							class="group flex flex-col rounded-2xl glass p-1.5 text-left transition hover:border-white/25"
							onclick={() =>
								create({ name: preset.name, sceneIds: [scene.id], colors: preset.colors })}
						>
							<PaletteStrip
								{scene}
								colors={preset.colors}
								class="h-16 overflow-hidden rounded-xl"
							/>
							<span
								class="flex items-center justify-between gap-1 px-1.5 pt-2 pb-1 text-xs font-medium"
							>
								<span class="truncate">{preset.name}</span>
								<HousePlus
									class="size-3.5 shrink-0 text-white/40 transition group-hover:text-white"
								/>
							</span>
						</button>
					{/each}
				</div>
			{/each}
		</section>
	{/if}
</main>

{#if renaming}
	{@const project = renaming}
	<NameDialog
		title="Rename project"
		label="Project name"
		initial={project.name}
		submitLabel="Save"
		onsubmit={(name) => {
			renaming = null;
			rename(project, name);
		}}
		onclose={() => (renaming = null)}
	/>
{/if}

{#if duplicating}
	{@const project = duplicating}
	<NameDialog
		title="Duplicate"
		label="Project name"
		initial="{project.name} (copy)"
		submitLabel="Save"
		onsubmit={(name) => {
			duplicating = null;
			duplicate(project, name);
		}}
		onclose={() => (duplicating = null)}
	/>
{/if}

{#if sharing}
	<ShareDialog project={sharing} onclose={() => (sharing = null)} />
{/if}
