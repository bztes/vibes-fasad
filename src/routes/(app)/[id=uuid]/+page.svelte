<script lang="ts">
	import { goto } from '$app/navigation';
	import { href } from '#lib/components/app/nav.svelte.ts';
	import FacadePreview from '#lib/components/fasad/FacadePreview.svelte';
	import PalettePreview from '#lib/components/fasad/PalettePreview.svelte';
	import PaletteStrip from '#lib/components/fasad/PaletteStrip.svelte';
	import SceneDialog from '#lib/components/fasad/SceneDialog.svelte';
	import ShareDialog from '#lib/components/fasad/ShareDialog.svelte';
	import SurfaceMixer from '#lib/components/fasad/SurfaceMixer.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import ConfirmDelete from '#lib/components/ui/ConfirmDelete.svelte';
	import NameDialog from '#lib/components/ui/NameDialog.svelte';
	import Swatches from '#lib/components/ui/Swatches.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { benchFor, mixColors } from '#lib/fasad/color.ts';
	import { timeAgo } from '#lib/fasad/format.ts';
	import { partIcon } from '#lib/fasad/labels.ts';
	import { access, edit, getOpenProject, noticeAccount } from '#lib/fasad/project.svelte.ts';
	import {
		deletePalette,
		duplicateProject,
		saveColor,
		savePalette,
		updateProject
	} from '#lib/fasad/projects.remote.ts';
	import { findScene, fitsScene, sceneColors, scenesById } from '#lib/fasad/scene.ts';
	import {
		allows,
		type MixPart,
		type PartColors,
		type PartRecipes,
		type UserPalette
	} from '#lib/fasad/types.ts';
	import {
		ArrowLeft,
		BookmarkPlus,
		Check,
		ChevronDown,
		CopyPlus,
		Eye,
		FlaskConical,
		House,
		Palette,
		Pencil,
		Plus,
		RefreshCw,
		Share2,
		Shuffle,
		X
	} from '@lucide/svelte';

	let data = $derived(await getCatalog());

	const open = getOpenProject();
	let project = $derived(open());
	/** Others' projects can only be looked at. */
	let editable = $derived(allows(project.role, 'edit'));

	let naming = $state<'rename' | 'duplicate' | 'palette' | null>(null);
	/** A surface's colour, with the mix it was painted with, being named before it's saved to the library. */
	let saving = $state<{ hex: string; recipe: MixPart[] } | null>(null);
	let sharing = $state(false);

	/** Whether the open scenes' colours are shown as swatches below the photo, or just a strip. */
	let showPalette = $state(false);
	let addingScene = $state(false);

	type Painting = { sceneIds: string[]; colors: PartColors; recipes: PartRecipes };
	/** Scenes and colours tried on a project that can only be looked at, which aren't saved. */
	let tried = $state<Painting | null>(null);
	let colors = $derived(tried?.colors ?? project.colors);
	let recipes = $derived(tried?.recipes ?? project.recipes);

	/** The project's scenes that still exist, or else the first scene. */
	let openScenes = $derived.by(() => {
		const open = scenesById(data.scenes, tried?.sceneIds ?? project.sceneIds);
		return open.length ? open : data.scenes.slice(0, 1);
	});
	let sceneId = $state<string | null>(null);
	/** The scene being looked at, or the first open one if it was closed or deleted. */
	let scene = $derived(findScene(openScenes, sceneId));
	/** Colour of every painted part of the scene. */
	let surfaceColors = $derived(sceneColors(scene, colors));

	/** Saves changes to the project, showing them right away, or only tries them on others'. */
	function paint(changes: Partial<Painting>) {
		if (!editable) {
			tried = { sceneIds: openScenes.map((scene) => scene.id), colors, recipes, ...changes };
			return;
		}
		edit(project, updateProject({ ...access(project), ...changes }), (current) => ({
			...current,
			...changes
		}));
	}

	/**
	 * Paints the parts in `colors`, e.g. a palette's, leaving the others as they are. Parts that
	 * change colour forget their mix unless `mixed` gives them a new one.
	 */
	function applyColors(changes: PartColors, mixed: PartRecipes = {}) {
		const kept = Object.entries(recipes).filter(
			([layer]) => (changes[layer] ?? colors[layer]) === colors[layer]
		);
		paint({
			colors: { ...colors, ...changes },
			recipes: { ...Object.fromEntries(kept), ...mixed }
		});
	}

	/** Scenes that can still be added to the project. */
	let addable = $derived(data.scenes.filter((scene) => !openScenes.includes(scene)));

	/** Adds scenes to the project, showing the first one added. */
	function addScenes(ids: string[]) {
		const added = ids.filter((id) => !openScenes.some((scene) => scene.id === id));
		if (!added.length) return;
		paint({ sceneIds: [...openScenes.map((scene) => scene.id), ...added] });
		sceneId = added[0];
	}

	/** Its colours are kept, so adding it back brings them along. Its last scene stays. */
	function removeScene(id: string) {
		if (openScenes.length < 2) return;
		paint({ sceneIds: openScenes.flatMap((scene) => (scene.id === id ? [] : [scene.id])) });
		if (!mixPart) stopMixing();
	}

	// The mixing bench, for a part of the scene; the preview shows the mix on it until applied.
	let mixLayer = $state<string | null>(null);
	let mix = $state<MixPart[]>([]);
	/** The saved mix on the bench, which saving changes instead of adding a colour. */
	let mixEditingId = $state<string | null>(null);
	/** The part being mixed for, while it's on the open scene. */
	let mixPart = $derived(scene.parts.find((part) => part.layer === mixLayer));
	let mixResult = $derived(mixColors(mix));

	/**
	 * Starts mixing for a part, beginning with the mix it was painted with, else its current colour,
	 * or an empty bench if unpainted.
	 */
	function mixFor(layer: string) {
		const hex = surfaceColors[layer];
		({ mix, editingId: mixEditingId } = hex
			? benchFor({ name: hex.toUpperCase(), hex }, project.library)
			: { mix: [], editingId: null });
		if (recipes[layer]?.length) mix = recipes[layer].map((part) => ({ ...part }));
		mixLayer = layer;
	}

	function stopMixing() {
		mixLayer = null;
		mixEditingId = null;
	}

	function applyMix() {
		if (mixPart && mixResult)
			applyColors({ [mixPart.layer]: mixResult }, { [mixPart.layer]: $state.snapshot(mix) });
		stopMixing();
	}

	/** Only changes what's shown, so it isn't saved into the project. Mixing stops off its scene. */
	function setScene(id: string) {
		sceneId = id;
		if (!mixPart) stopMixing();
	}

	let presets = $derived(data.presets.filter((preset) => fitsScene(scene, preset.colors)));
	/** The project's palettes for the open scene, newest first. */
	let scenePalettes = $derived(
		project.palettes.filter((palette) => fitsScene(scene, palette.colors))
	);

	const isActive = (colors: PartColors) =>
		Object.entries(sceneColors(scene, colors)).every(([part, hex]) => surfaceColors[part] === hex);

	let savedHexes = $derived(new Set(project.library.map((color) => color.hex)));

	/** Names by hex, the project's own colours taking precedence over the catalog's. */
	let colorNames = $derived(
		new Map(
			[...data.catalog, ...project.library].map((color) => [color.hex.toLowerCase(), color.name])
		)
	);

	/** The mix a part was painted with, else that of the saved mix in its colour. */
	function recipeFor(layer: string, hex: string | undefined) {
		if (recipes[layer]?.length) return recipes[layer];
		return project.library.find((color) => color.hex === hex && color.recipe.length)?.recipe ?? [];
	}

	/** The colours, with the mix shown on the part it's being mixed for. */
	let previewColors = $derived(
		mixPart && mixResult ? { ...colors, [mixPart.layer]: mixResult } : colors
	);

	const tabClass =
		'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white aria-selected:bg-white/15 aria-selected:text-white';

	function shuffle() {
		if (data.catalog.length < 2) return;
		const pick = () => data.catalog[Math.floor(Math.random() * data.catalog.length)].hex;
		applyColors(Object.fromEntries(scene.parts.map((part) => [part.layer, pick()])));
	}

	/** Overwrites the palette's colours with the scene's current surface colours. */
	const updatePalette = ({ id, name }: UserPalette) =>
		edit(project, savePalette({ ...access(project), paletteId: id, name, colors: surfaceColors }));

	async function duplicate(name: string) {
		const copy = noticeAccount(await duplicateProject({ ...access(project), name }));
		goto(href(`/${copy.id}`));
	}
</script>

<svelte:head>
	<title>{project.name} · Fasad</title>
</svelte:head>

<!-- A palette to apply; the user's own (with an id) can be deleted. -->
{#snippet paletteButton(name: string, colors: PartColors, palette?: UserPalette)}
	{@const active = isActive(colors)}
	<div
		class="relative overflow-hidden rounded-2xl border border-white/6 bg-white/4 transition hover:border-white/20 hover:bg-white/10 has-aria-pressed:border-primary-300/60"
	>
		<button
			class="block w-full text-left"
			aria-pressed={active}
			onclick={() => applyColors(sceneColors(scene, colors))}
		>
			<PaletteStrip {scene} {colors} class="h-12" />
			<span class="flex items-center justify-between gap-1 px-2.5 py-2 text-xs font-medium">
				<span class="truncate {palette ? (active ? 'pr-7' : 'pr-14') : ''}">{name}</span>
				{#if active && !palette}<Check class="size-3.5 shrink-0 text-primary-300" />{/if}
			</span>
		</button>
		{#if palette && editable}
			<span class="absolute right-0.5 bottom-0.5 flex items-center">
				{#if !active}
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Update {name} with the current colours"
						title="Update {name} with the current colours"
						onclick={() => updatePalette(palette)}
					>
						<RefreshCw class="size-4" />
					</Button>
				{/if}
				<ConfirmDelete
					label="Delete {name}"
					ondelete={() =>
						edit(project, deletePalette({ ...access(project), paletteId: palette.id }))}
				/>
			</span>
		{/if}
	</div>
{/snippet}

<!-- Fills the window below the mobile header and above the tab bar; only the side panel scrolls. -->
<main
	class="mx-auto flex h-[calc(100dvh-11rem)] max-w-[1600px] flex-col p-4 sm:p-6 lg:h-dvh lg:p-8"
>
	<header class="mb-5 flex shrink-0 flex-wrap items-end justify-between gap-4">
		<div class="min-w-0">
			<a
				href={href('/')}
				class="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/55 transition hover:text-white"
			>
				<ArrowLeft class="size-3.5" />
				All projects
			</a>
			<p
				class="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase"
			>
				{#if !editable}
					<Eye class="size-3.5 text-white/60" />
					View only
				{:else}
					<span class="size-1.5 rounded-full bg-primary-300 shadow-[0_0_8px] shadow-primary-300"
					></span>
					Saved {timeAgo(project.updatedAt)}
				{/if}
			</p>
			<h1 class="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight sm:text-4xl">
				<span class="truncate">{project.name}</span>
				{#if editable}
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Rename"
						onclick={() => (naming = 'rename')}
					>
						<Pencil class="size-4" />
					</Button>
				{/if}
			</h1>
			{#if !editable}
				<p class="mt-1.5 max-w-xl text-xs text-white/55">
					You can try colours on this project, but they aren't saved. Open it with an edit link to
					change it, or duplicate it to make it your own.
				</p>
			{/if}
		</div>

		<div class="flex flex-wrap gap-2">
			<Button
				onclick={shuffle}
				disabled={data.catalog.length < 2}
				title="Try a random combination from the colour catalogue"
			>
				<Shuffle class="size-4" />
				Shuffle
			</Button>
			{#if project.role === 'owner'}
				<Button onclick={() => (sharing = true)}>
					<Share2 class="size-4" />
					Share
				</Button>
			{:else if !editable}
				<Button variant="primary" onclick={() => (naming = 'duplicate')}>
					<CopyPlus class="size-4" />
					Duplicate to save
				</Button>
			{/if}
		</div>
	</header>

	<!-- On a phone the preview sits above the panel, giving it more room while mixing. -->
	<div
		class="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 {mixPart
			? 'grid-rows-[minmax(0,2fr)_minmax(0,3fr)]'
			: 'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]'}"
	>
		<div class="flex min-h-0 flex-col gap-3">
			<!-- A phone has no room for both, so the swatches cover the photo while open. -->
			<div class="relative min-h-0 flex-1" class:max-lg:hidden={showPalette}>
				<FacadePreview {scene} colors={previewColors} class="h-full" />

				<div
					class="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-full glass-strong p-1 sm:top-4 sm:left-4"
					role="tablist"
					aria-label="Scenes"
				>
					{#each openScenes as tab (tab.id)}
						{@const selected = tab.id === scene.id}
						<button
							class={tabClass}
							role="tab"
							aria-selected={selected}
							onclick={() => setScene(tab.id)}
						>
							<House class="size-3.5" />
							{tab.name}
						</button>
						{#if selected && openScenes.length > 1}
							<button
								class="-ml-1 grid size-6 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
								aria-label="Remove {tab.name} from the project"
								title="Remove {tab.name} from the project"
								onclick={() => removeScene(tab.id)}
							>
								<X class="size-3.5" />
							</button>
						{/if}
					{/each}
					{#if addable.length}
						<button
							class={tabClass}
							aria-label="Add scene"
							title="Add scene"
							onclick={() => (addingScene = true)}
						>
							<Plus class="size-3.5" />
						</button>
					{/if}
				</div>
			</div>

			<!-- The open scenes' colours side by side: a strip until opened, then a swatch per surface. -->
			{#if showPalette}
				<section
					class="flex min-h-0 flex-1 animate-rise flex-col gap-2 rounded-[2rem] glass p-3 lg:max-h-[45%] lg:min-h-40 lg:flex-none lg:basis-2/5"
					aria-label="The colour scheme as swatches"
				>
					<button
						class="flex items-center gap-1.5 px-1.5 text-left text-xs font-medium text-white/60 transition hover:text-white"
						aria-expanded="true"
						onclick={() => (showPalette = false)}
					>
						<Palette class="size-3.5" />
						Palette
						<ChevronDown class="ml-auto size-4" />
					</button>
					<div class="flex min-h-0 flex-1 gap-3">
						{#each openScenes as tab (tab.id)}
							{@const selected = tab.id === scene.id}
							<div class="flex min-w-0 flex-1 flex-col gap-1.5">
								{#if openScenes.length > 1}
									<button
										class="truncate px-1.5 text-left text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase transition hover:text-white aria-pressed:text-primary-200"
										aria-pressed={selected}
										onclick={() => setScene(tab.id)}
									>
										{tab.name}
									</button>
								{/if}
								<PalettePreview
									scene={tab}
									colors={selected ? previewColors : colors}
									catalog={data.catalog}
									onpick={(layer) => {
										setScene(tab.id);
										mixFor(layer);
									}}
									class="min-h-0 flex-1"
								/>
							</div>
						{/each}
					</div>
				</section>
			{:else}
				<button
					class="group flex h-3 shrink-0 gap-1.5 rounded-full transition-[height] duration-200 hover:h-5"
					aria-expanded="false"
					aria-label="Show the colours as swatches"
					title="Show the colours as swatches"
					onclick={() => (showPalette = true)}
				>
					{#each openScenes as tab (tab.id)}
						<PaletteStrip
							scene={tab}
							colors={tab.id === scene.id ? previewColors : colors}
							class="h-full min-w-0 flex-1 overflow-hidden rounded-full opacity-80 transition group-hover:opacity-100"
						/>
					{/each}
				</button>
			{/if}
		</div>

		<div class="min-h-0 space-y-5 overflow-y-auto overscroll-contain rounded-3xl">
			{#if mixPart}
				{#key mixPart.id}
					<SurfaceMixer
						{project}
						part={mixPart}
						catalog={data.catalog}
						bind:mix
						bind:editingId={mixEditingId}
						onapply={applyMix}
						onclose={stopMixing}
					/>
				{/key}
			{:else}
				<Card padding="sm">
					<div class="mb-3 flex items-start justify-between gap-2 px-1">
						<div>
							<h2 class="text-sm font-semibold">Surfaces</h2>
							<p class="mt-0.5 text-xs text-white/50">
								Tap a surface to mix its colour; the house shows it as you go.
							</p>
						</div>
						{#if editable}
							<Button size="sm" onclick={() => (naming = 'palette')}>
								<BookmarkPlus class="size-3.5" />
								Save as palette
							</Button>
						{/if}
					</div>
					<div class="space-y-2">
						{#each scene.parts as part (part.id)}
							{@const Icon = partIcon(part.icon)}
							{@const hex = surfaceColors[part.layer]}
							{@const recipe = hex ? recipeFor(part.layer, hex) : []}
							<div
								class="group flex items-center gap-1 rounded-2xl border border-white/6 bg-white/4 p-2 transition hover:border-white/20 hover:bg-white/10"
							>
								<button
									class="flex min-w-0 flex-1 items-center gap-3 text-left"
									aria-label="Mix colour for {part.name.toLowerCase()}"
									onclick={() => mixFor(part.layer)}
								>
									<span
										class={[
											'grid size-14 shrink-0 place-items-center rounded-xl chip transition-colors duration-300',
											!hex && 'bg-white/10'
										]}
										style:background-color={hex}
									>
										<FlaskConical
											class="size-4 opacity-0 drop-shadow transition group-hover:opacity-90"
										/>
									</span>
									<span class="min-w-0 flex-1">
										<span class="flex items-center gap-1.5 text-sm font-medium">
											<Icon class="size-3.5 text-white/45" />
											{part.name}
										</span>
										{#if part.hint}
											<span class="block truncate text-xs text-white/45">{part.hint}</span>
										{/if}
									</span>
									<span class="max-w-[40%] min-w-0 text-right">
										{#if hex && colorNames.get(hex)}
											<span class="block truncate text-xs font-medium text-white/75">
												{colorNames.get(hex)}
											</span>
										{/if}
										<span class="block font-mono text-[11px] text-white/50 uppercase">
											{hex ?? '—'}
										</span>
										{#if recipe.length}
											<span class="mt-1 flex justify-end">
												<Swatches size="sm" colors={recipe.map((part) => part.hex)} />
											</span>
										{/if}
									</span>
								</button>
								{#if !hex || !editable}
									<!-- Nothing to save while the surface is as in the photo, or into others' projects. -->
								{:else if savedHexes.has(hex)}
									<span
										class="grid size-8 place-items-center text-primary-300"
										title="In my colours"
									>
										<Check class="size-4" />
									</span>
								{:else}
									<Button
										size="icon-sm"
										variant="ghost"
										aria-label="Save the {part.name.toLowerCase()} colour to my colours"
										title="Save the {part.name.toLowerCase()} colour to my colours"
										onclick={() =>
											(saving = { hex, recipe: $state.snapshot(recipes[part.layer] ?? []) })}
									>
										<BookmarkPlus class="size-4" />
									</Button>
								{/if}
							</div>
						{/each}
					</div>
				</Card>

				<Card padding="sm">
					<div class="mb-3 px-1">
						<h2 class="text-sm font-semibold">Palettes</h2>
					</div>

					{#if scenePalettes.length}
						<h3
							class="mb-2 px-1 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase"
						>
							My palettes
						</h3>
						<div class="mb-4 grid grid-cols-2 gap-2">
							{#each scenePalettes as palette (palette.id)}
								{@render paletteButton(palette.name, palette.colors, palette)}
							{/each}
						</div>
						{#if presets.length}
							<h3
								class="mb-2 px-1 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase"
							>
								Palettes
							</h3>
						{/if}
					{/if}

					{#if presets.length}
						<div class="grid grid-cols-2 gap-2">
							{#each presets as preset (preset.id)}
								{@render paletteButton(preset.name, preset.colors)}
							{/each}
						</div>
					{:else if !scenePalettes.length}
						<p class="rounded-2xl well p-3 text-xs text-white/45">
							No predefined palettes available.
						</p>
					{/if}
				</Card>
			{/if}
		</div>
	</div>
</main>

{#if addingScene}
	<SceneDialog
		scenes={addable}
		groups={data.groups}
		title="Add scene"
		subtitle="Pick a scene to paint in this project too, or a whole group of them."
		onpick={(sceneIds) => {
			addScenes(sceneIds);
			addingScene = false;
		}}
		onclose={() => (addingScene = false)}
	/>
{/if}

{#if naming === 'rename'}
	<NameDialog
		title="Rename project"
		label="Project name"
		initial={project.name}
		submitLabel="Save"
		onsubmit={(name) => {
			edit(project, updateProject({ ...access(project), name }), (current) => ({
				...current,
				name
			}));
			naming = null;
		}}
		onclose={() => (naming = null)}
	/>
{:else if naming === 'duplicate'}
	<NameDialog
		title="Duplicate"
		label="Project name"
		initial="{project.name} (copy)"
		submitLabel="Save"
		onsubmit={(name) => {
			naming = null;
			duplicate(name);
		}}
		onclose={() => (naming = null)}
	/>
{:else if naming === 'palette'}
	<NameDialog
		title="Save as palette"
		label="Palette name"
		initial="My palette {scenePalettes.length + 1}"
		submitLabel="Save"
		onsubmit={(name) => {
			edit(project, savePalette({ ...access(project), name, colors: surfaceColors }));
			naming = null;
		}}
		onclose={() => (naming = null)}
	/>
{/if}

{#if saving}
	{@const { hex, recipe } = saving}
	<NameDialog
		title="Save to my colours"
		label="Colour name"
		initial={colorNames.get(hex) ?? hex.toUpperCase()}
		submitLabel="Save"
		onsubmit={(name) => {
			edit(project, saveColor({ ...access(project), name, hex, recipe }));
			saving = null;
		}}
		onclose={() => (saving = null)}
	/>
{/if}

{#if sharing && project.role === 'owner'}
	<ShareDialog {project} onclose={() => (sharing = false)} />
{/if}
