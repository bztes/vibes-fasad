<script lang="ts">
	import MixSwatch from '#lib/components/fasad/MixSwatch.svelte';
	import MixIngredients from '#lib/components/fasad/MixIngredients.svelte';
	import ColorPicker from '#lib/components/fasad/ColorPicker.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import { addColor, mixCode, mixColors } from '#lib/fasad/color.ts';
	import { partIcon } from '#lib/fasad/labels.ts';
	import { access, edit } from '#lib/fasad/project.svelte.ts';
	import { saveColor } from '#lib/fasad/projects.remote.ts';
	import {
		allows,
		type CatalogColor,
		type MixPart,
		type OpenProject,
		type ScenePart
	} from '#lib/fasad/types.ts';
	import { Check, CopyPlus, Plus, Save, X } from '@lucide/svelte';

	/**
	 * Mixes a colour for one part of the scene on the studio's bench. The studio previews the
	 * result on the part until it's applied; cancelling leaves the part as it was.
	 */
	let {
		project,
		part,
		catalog,
		mix = $bindable(),
		editingId = $bindable(),
		onapply,
		onclose
	}: {
		project: OpenProject;
		part: ScenePart;
		catalog: CatalogColor[];
		mix: MixPart[];
		/** The saved mix on the bench, which saving changes instead of adding a colour. */
		editingId: string | null;
		onapply: () => void;
		onclose: () => void;
	} = $props();

	/** The saved mix being edited; undefined once it's deleted. */
	let editing = $derived(project.library.find((color) => color.id === editingId));

	let adding = $state(false);
	let justSaved = $state(false);

	let Icon = $derived(partIcon(part.icon));
	let result = $derived(mixColors(mix));
	/** The colours that actually go into the tin. */
	let used = $derived(mix.filter((part) => part.parts > 0));
	/** Others' projects can only be looked at, so mixes can't be saved into them. */
	let editable = $derived(allows(project.role, 'edit'));

	/** Saves the bench over the saved mix being edited, or as a copy of it, which further saves then update. */
	async function save(asNew = false) {
		const color = editing;
		if (!result || !color) return;
		const id = await edit(
			project,
			saveColor({
				...access(project),
				colorId: asNew ? undefined : color.id,
				name: asNew ? `${color.name} (copy)` : color.name,
				hex: result,
				code: asNew ? undefined : mixCode(mix),
				recipe: mix
			})
		);
		if (asNew) editingId = id;
		justSaved = true;
		setTimeout(() => (justSaved = false), 1800);
	}
</script>

<Card padding="sm" class="space-y-4">
	<header class="flex items-center gap-4 px-1">
		<MixSwatch {mix} />
		<div class="min-w-0 flex-1 self-stretch py-1">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<p class="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
						{editing ? `Editing ${editing.name}` : 'Mixing for'}
					</p>
					<h2 class="mt-0.5 flex items-center gap-1.5 text-lg font-semibold">
						<Icon class="size-4 shrink-0 text-white/45" />
						<span class="truncate">{part.name}</span>
					</h2>
				</div>
				<Button
					size="icon-sm"
					variant="ghost"
					class="-mt-1 -mr-1"
					aria-label="Cancel"
					title="Cancel"
					onclick={onclose}
				>
					<X class="size-4" />
				</Button>
			</div>
			<!-- How much of the tin each colour makes up. -->
			<div class="mt-3 flex h-2 overflow-hidden rounded-full bg-white/6">
				{#each used as part, index (index)}
					<span
						class="h-full transition-[flex-grow] duration-300"
						style:background-color={part.hex}
						style:flex-grow={part.parts}
					></span>
				{/each}
			</div>
			<p class="mt-1.5 text-xs text-white/50">
				{used.length ? `${used.length}-colour mix` : 'Add colours to start mixing'}
			</p>
		</div>
	</header>

	<div>
		<div class="mb-2 flex items-center justify-between px-1">
			<div>
				<h3 class="text-sm font-semibold">Colours in the mix</h3>
				<p class="text-xs text-white/50">Set how many parts of each.</p>
			</div>
			<Button size="sm" variant="primary" onclick={() => (adding = true)}>
				<Plus class="size-3.5" />
				Add colour
			</Button>
		</div>

		<MixIngredients bind:mix {catalog} library={project.library} />
	</div>

	<footer class="flex flex-wrap items-center gap-2 border-t border-white/8 px-1 pt-3">
		<!-- Others' projects can only be looked at, so mixes can't be saved into them. -->
		{#if editable && editing}
			<Button size="sm" variant="ghost" disabled={!result} onclick={() => save()}>
				{#if justSaved}
					<Check class="size-3.5 text-primary-300" />
					Saved
				{:else}
					<Save class="size-3.5" />
					Update colour
				{/if}
			</Button>
			<Button size="sm" variant="ghost" disabled={!result} onclick={() => save(true)}>
				<CopyPlus class="size-3.5" />
				Duplicate
			</Button>
		{/if}
		<span class="ml-auto flex gap-2">
			<Button size="sm" variant="ghost" onclick={onclose}>Cancel</Button>
			<Button size="sm" variant="primary" disabled={!result} onclick={onapply}>
				<Check class="size-3.5" />
				Apply
			</Button>
		</span>
	</footer>
</Card>

{#if adding}
	<Dialog
		title="Add colour"
		subtitle="Pick a colour to pour into the mix."
		onclose={() => (adding = false)}
	>
		<ColorPicker
			{catalog}
			library={project.library}
			initial={result ?? '#c99b42'}
			pickLabel="Add to mix"
			onpick={(color) => {
				mix = addColor(mix, color, project.library);
				adding = false;
			}}
		/>
	</Dialog>
{/if}
