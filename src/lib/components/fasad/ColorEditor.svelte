<script lang="ts">
	import { goto } from '$app/navigation';
	import { getNav, href } from '#lib/components/app/nav.svelte.ts';
	import MixSwatch from '#lib/components/fasad/MixSwatch.svelte';
	import MixIngredients from '#lib/components/fasad/MixIngredients.svelte';
	import ColorPicker from '#lib/components/fasad/ColorPicker.svelte';
	import ProjectSelect from '#lib/components/fasad/ProjectSelect.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { addPart, mixCode, mixColors } from '#lib/fasad/color.ts';
	import { access, edit, getHeldProjects, savedColors } from '#lib/fasad/project.svelte.ts';
	import { saveColor } from '#lib/fasad/projects.remote.ts';
	import {
		allows,
		type CatalogColor,
		type MixPart,
		type OpenProject,
		type Color,
		type SavedColor
	} from '#lib/fasad/types.ts';
	import { BookmarkPlus, Pipette, Save } from '@lucide/svelte';
	import { untrack } from 'svelte';

	/**
	 * Makes a colour, saved into the project picked, or changes `color` in its project, by mixing
	 * colours in parts.
	 */
	let {
		color,
		start,
		catalog
	}: {
		/** The saved colour to edit, with the project it's saved in; a new one is made without it. */
		color?: SavedColor & { project: OpenProject };
		/** Colour a new mix starts with, e.g. a catalogue colour opened in the mixer. */
		start?: Color;
		catalog: CatalogColor[];
	} = $props();

	const nav = getNav();
	const held = getHeldProjects();
	/** Where the colour is saved: its own project, or else the one picked. */
	let project = $derived(
		color?.project ?? held().find((candidate) => candidate.id === nav.target?.id)
	);
	/** Colours saved in any project, to mix from. */
	let library = $derived(savedColors(held()));

	// Saved colours without a recipe were picked ready-made, so they reopen as a one-colour mix.
	let mix = $state<MixPart[]>(
		untrack(() => {
			if (color?.recipe.length) return color.recipe.map((part) => ({ ...part }));
			const base = color ?? start;
			return base ? addPart([], base) : [];
		})
	);
	let name = $state(untrack(() => color?.name ?? ''));

	let used = $derived(mix.filter((part) => part.parts > 0));
	let result = $derived(mixColors(mix));
	let fallbackName = $derived(color?.name ?? `My mix ${(project?.library.length ?? 0) + 1}`);
	let editable = $derived(!!project && allows(project.role, 'edit'));
	let mine = $derived(href('/library/colors/mine'));

	async function save() {
		if (!result || !project) return;
		await edit(
			project,
			saveColor({
				...access(project),
				colorId: color?.id,
				name: name.trim() || fallbackName,
				hex: result,
				code: mixCode(mix),
				recipe: used
			})
		);
		goto(mine);
	}
</script>

<div class="mb-6 flex flex-wrap items-end gap-3">
	<label class="block min-w-0 flex-1 basis-64 text-xs font-medium text-white/60">
		Colour name
		<Input bind:value={name} maxlength={120} placeholder={fallbackName} class="mt-1.5" />
	</label>
	<div class="flex flex-wrap items-center gap-2">
		{#if color}
			<span class="text-xs text-white/50">
				Saved in {color.project.name}
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
		<Button variant="primary" disabled={!result || !editable} onclick={save}>
			{#if color}
				<Save class="size-4" />
				Update colour
			{:else}
				<BookmarkPlus class="size-4" />
				Save to my colours
			{/if}
		</Button>
	</div>
	{#if color && !editable}
		<p class="w-full text-xs text-white/50">
			This project can only be looked at, so nothing can be saved to it.
		</p>
	{/if}
</div>

<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
	<Card padding="md" class="space-y-5 lg:sticky lg:top-6">
		<MixSwatch {mix} size="lg" />

		<div>
			<h2 class="text-sm font-semibold">Colours in the mix</h2>
			<p class="mb-2 text-xs text-white/50">Set how many parts of each.</p>
			<MixIngredients bind:mix {catalog} {library} />
		</div>
	</Card>

	<Card padding="md">
		<h2 class="mb-1 flex items-center gap-2 text-sm font-semibold">
			<Pipette class="size-4 text-white/45" />
			Add colour
		</h2>
		<p class="mb-4 text-xs text-white/50">Pick a colour to pour into the mix.</p>
		<ColorPicker
			{catalog}
			{library}
			initial={result ?? '#c99b42'}
			pickLabel="Add to mix"
			onpick={(color) => (mix = addPart(mix, color))}
		/>
	</Card>
</div>
