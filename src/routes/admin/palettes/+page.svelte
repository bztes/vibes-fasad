<script lang="ts">
	import ColorField from '#lib/components/admin/ColorField.svelte';
	import EntryDialog from '#lib/components/admin/EntryDialog.svelte';
	import GroupField from '#lib/components/admin/GroupField.svelte';
	import ImportExport from '#lib/components/admin/ImportExport.svelte';
	import NameField from '#lib/components/admin/NameField.svelte';
	import SortField from '#lib/components/admin/SortField.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Swatches from '#lib/components/ui/Swatches.svelte';
	import {
		deletePalette,
		deletePaletteGroup,
		getPalettes,
		importPalettes,
		savePalette,
		savePaletteGroup
	} from '#lib/admin/palettes.remote.ts';
	import { nextSort, sectionsByGroup } from '#lib/fasad/types.ts';
	import { FolderPlus, Pencil, Plus } from '@lucide/svelte';

	let data = $derived(await getPalettes());

	type Palette = (typeof data.palettes)[number];
	type Group = (typeof data.groups)[number];

	let palettes = $derived(data.palettes);

	/** Every scene's part layers, first seen first, named after the first part on each. */
	let layerNames = $derived(
		new Map(
			data.scenes
				.flatMap((scene) => scene.parts)
				.toReversed()
				.map((part) => [part.layer, part.name])
		)
	);
	let knownLayers = $derived([
		...new Set(data.scenes.flatMap((scene) => scene.parts.map((part) => part.layer)))
	]);
	/** A palette's own layers, known ones in scene order and others after. */
	const layersOf = (colors: Record<string, string>) => [
		...knownLayers.filter((layer) => layer in colors),
		...Object.keys(colors).filter((layer) => !layerNames.has(layer))
	];

	/** The palette being edited; without `palette`, a new one in `groupId`. */
	let editing = $state<{ palette?: Palette; groupId: string | null }>();
	/** The group being edited; an empty object while adding one. */
	let editingGroup = $state<{ group?: Group }>();

	let groups = $derived(sectionsByGroup(data.groups, palettes));
</script>

<header class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold tracking-tight">Palettes</h1>
	<div class="flex flex-wrap items-center gap-2">
		<ImportExport table="palettes" title="Import palettes" form={importPalettes} />
		<Button size="sm" onclick={() => (editingGroup = {})}>
			<FolderPlus class="size-3.5" />
			New group
		</Button>
		<Button
			size="sm"
			variant="primary"
			disabled={!knownLayers.length}
			onclick={() => (editing = { groupId: null })}
		>
			<Plus class="size-3.5" />
			New palette
		</Button>
	</div>
</header>

{#if knownLayers.length}
	<div class="space-y-4">
		{#each groups as { group, items: palettes } (group?.id ?? null)}
			{@const name = group?.name ?? 'Other'}
			<Card class="overflow-hidden">
				<header class="flex items-center gap-3 border-b border-white/8 py-2 pr-2 pl-4">
					<h2 class="min-w-0 truncate text-sm font-semibold">{name}</h2>
					<span class="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/55 tabular-nums">
						{palettes.length} palettes
					</span>
					<span class="flex-1"></span>
					{#if group}
						<Button
							size="icon-sm"
							variant="ghost"
							aria-label="Edit group"
							title="Edit group"
							onclick={() => (editingGroup = { group })}
						>
							<Pencil class="size-4" />
						</Button>
					{/if}
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Add palette to {name}"
						title="Add palette to {name}"
						onclick={() => (editing = { groupId: group?.id ?? null })}
					>
						<Plus class="size-4" />
					</Button>
				</header>

				<div class="divide-y divide-white/8">
					{#each palettes as palette (palette.id)}
						{@const layers = layersOf(palette.colors)}
						<button
							type="button"
							onclick={() => (editing = { palette, groupId: palette.groupId })}
							class="group flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-white/5"
						>
							<span title={layers.map((layer) => layerNames.get(layer) ?? layer).join(', ')}>
								<Swatches size="lg" colors={layers.map((layer) => palette.colors[layer])} />
							</span>
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{palette.name}</span>
							<span class="text-xs text-white/35 tabular-nums">{palette.sortOrder}</span>
							<Pencil class="size-4 text-white/30 transition group-hover:text-white/70" />
						</button>
					{:else}
						<p class="px-4 py-3 text-sm text-white/45">Nothing here yet.</p>
					{/each}
				</div>
			</Card>
		{:else}
			<Card padding="sm"><p class="text-sm text-white/55">Nothing here yet.</p></Card>
		{/each}
	</div>
{:else}
	<Card padding="md"
		><p class="text-sm text-white/55">Add a scene first; palettes belong to a scene.</p></Card
	>
{/if}

{#if editing}
	{@const palette = editing.palette}
	{@const siblings = palettes.filter((row) => row.groupId === editing?.groupId)}
	{@const form = savePalette.for(palette?.id ?? '')}
	<EntryDialog
		title={palette ? 'Edit palette' : 'New palette'}
		{form}
		id={palette?.id}
		ondelete={palette && (() => deletePalette(palette.id))}
		onclose={() => (editing = undefined)}
	>
		<NameField field={form.fields.name} value={palette?.name} />
		<GroupField field={form.fields.groupId} groups={data.groups} value={editing.groupId} />
		<div class="flex flex-wrap items-start gap-5">
			<!-- A new palette paints every layer; an existing one only its own, to not invent colours. -->
			{#each palette ? layersOf(palette.colors) : knownLayers as layer, index (layer)}
				{@const color = form.fields.colors[index]}
				<input {...color.layer.as('hidden', layer)} />
				<ColorField
					field={color.hex}
					label={layerNames.get(layer) ?? layer}
					value={palette?.colors[layer]}
				/>
			{/each}
			<SortField field={form.fields.sortOrder} value={palette?.sortOrder ?? nextSort(siblings)} />
		</div>
	</EntryDialog>
{/if}

{#if editingGroup}
	{@const group = editingGroup.group}
	{@const form = savePaletteGroup.for(group?.id ?? '')}
	<EntryDialog
		title={group ? 'Edit group' : 'New group'}
		{form}
		id={group?.id}
		ondelete={group && (() => deletePaletteGroup(group.id))}
		invalidMessage="Please fill in a name."
		note="Deleting a group keeps its palettes, without a group."
		onclose={() => (editingGroup = undefined)}
	>
		<div class="flex flex-wrap items-end gap-3">
			<label class="block min-w-48 flex-1 text-xs font-medium text-white/60">
				Group
				<Input
					{...form.fields.name.as('text', group?.name ?? '')}
					placeholder="e.g. Swedish classics"
					required
					maxlength={120}
					data-autofocus
					class="mt-1.5"
				/>
			</label>
			<SortField field={form.fields.sortOrder} value={group?.sortOrder ?? nextSort(data.groups)} />
		</div>
	</EntryDialog>
{/if}
