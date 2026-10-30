<script lang="ts">
	import { goto } from '$app/navigation';
	import { getNav, href } from '#lib/components/app/nav.svelte.ts';
	import ColorPicker from '#lib/components/fasad/ColorPicker.svelte';
	import PalettePreview from '#lib/components/fasad/PalettePreview.svelte';
	import ProjectSelect from '#lib/components/fasad/ProjectSelect.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { access, edit, getHeldProjects, savedColors } from '#lib/fasad/project.svelte.ts';
	import { savePalette } from '#lib/fasad/projects.remote.ts';
	import { findScene, fitsScene, sceneFor } from '#lib/fasad/scene.ts';
	import {
		allows,
		type CatalogColor,
		type OpenProject,
		type PartColors,
		type Scene,
		type UserPalette
	} from '#lib/fasad/types.ts';
	import { BookmarkPlus, House, Save } from '@lucide/svelte';
	import { untrack } from 'svelte';

	/**
	 * Makes a palette, saved into the project picked, or changes `palette` in its project: a colour
	 * per surface, shown as swatches on a scene it fits.
	 */
	let {
		palette,
		scenes,
		catalog
	}: {
		/** The palette to edit, with the project it's saved in; a new one is made without it. */
		palette?: UserPalette & { project: OpenProject };
		scenes: Scene[];
		catalog: CatalogColor[];
	} = $props();

	const nav = getNav();
	const held = getHeldProjects();
	/** Where the palette is saved: its own project, or else the one picked. */
	let project = $derived(
		palette?.project ?? held().find((candidate) => candidate.id === nav.target?.id)
	);
	/** Colours saved in any project, to pick from. */
	let library = $derived(savedColors(held()));

	// Colours are kept by part layer, so switching scenes carries them over to parts on the same layer.
	let sceneId = $state(untrack(() => palette && sceneFor(scenes, palette.colors)?.id));
	let scene = $derived(findScene(scenes, sceneId));
	let colors = $state<PartColors>(untrack(() => ({ ...palette?.colors })));
	let name = $state(untrack(() => palette?.name ?? ''));
	let layer = $state<string>();

	let part = $derived(scene.parts.find((candidate) => candidate.layer === layer) ?? scene.parts[0]);
	let fallbackName = $derived(palette?.name ?? `My palette ${(project?.palettes.length ?? 0) + 1}`);
	let editable = $derived(!!project && allows(project.role, 'edit'));
	let mine = $derived(href('/library/palettes/mine'));

	async function save() {
		if (!project) return;
		await edit(
			project,
			savePalette({
				...access(project),
				paletteId: palette?.id,
				name: name.trim() || fallbackName,
				colors
			})
		);
		goto(mine);
	}
</script>

<div class="mb-6 flex flex-wrap items-end gap-3">
	<label class="block min-w-0 flex-1 basis-64 text-xs font-medium text-white/60">
		Palette name
		<Input bind:value={name} maxlength={120} placeholder={fallbackName} class="mt-1.5 glass" />
	</label>
	<div class="flex flex-wrap items-center gap-2">
		{#if palette}
			<span class="text-xs text-white/50">
				Saved in {palette.project.name}
			</span>
		{:else}
			<ProjectSelect class="w-full sm:w-56" />
		{/if}
		<a
			href={mine}
			class="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white"
		>
			Cancel
		</a>
		<!-- A palette painting no part of any scene couldn't be shown. -->
		<Button
			variant="primary"
			disabled={!editable || !scenes.some((scene) => fitsScene(scene, colors))}
			onclick={save}
		>
			{#if palette}
				<Save class="size-4" />
				Save
			{:else}
				<BookmarkPlus class="size-4" />
				Save as palette
			{/if}
		</Button>
	</div>
	{#if palette && !editable}
		<p class="w-full text-xs text-white/50">
			This project can only be looked at, so nothing can be saved to it.
		</p>
	{/if}
</div>

<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
	<div class="space-y-4 lg:sticky lg:top-6">
		{#if scenes.length > 1}
			<div
				class="flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full glass p-1"
				role="tablist"
				aria-label="Scenes"
			>
				{#each scenes as tab (tab.id)}
					<button
						class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white aria-selected:bg-white/15 aria-selected:text-white"
						role="tab"
						aria-selected={tab.id === scene.id}
						onclick={() => (sceneId = tab.id)}
					>
						<House class="size-3.5" />
						{tab.name}
					</button>
				{/each}
			</div>
		{/if}
		<PalettePreview
			{scene}
			{colors}
			{catalog}
			selected={part?.layer}
			onpick={(picked) => (layer = picked)}
			class="h-[min(60dvh,32rem)]"
		/>
		<p class="text-xs text-white/50">Tap a surface to choose its colour.</p>
	</div>

	<Card padding="md" class="space-y-4">
		{#if part}
			<h2 class="text-sm font-semibold">{`Colour for ${part.name}`}</h2>
			{#key part.layer}
				<ColorPicker
					{catalog}
					{library}
					initial={colors[part.layer]}
					current={colors[part.layer]}
					pickLabel="Apply"
					onpick={(color) => (colors[part.layer] = color.hex.toLowerCase())}
				/>
			{/key}
		{/if}
	</Card>
</div>
