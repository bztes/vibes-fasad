<script lang="ts">
	import EntryDialog from '#lib/components/admin/EntryDialog.svelte';
	import GroupField from '#lib/components/admin/GroupField.svelte';
	import ImportExport from '#lib/components/admin/ImportExport.svelte';
	import NameField from '#lib/components/admin/NameField.svelte';
	import SortField from '#lib/components/admin/SortField.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import ColorField from '#lib/components/ui/ColorField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import {
		deleteColorGroup,
		deleteColor,
		getColors,
		importColors,
		saveColorGroup,
		saveColor
	} from '#lib/admin/colors.remote.ts';
	import { nextSort, sectionsByGroup } from '#lib/fasad/types.ts';
	import { FolderPlus, Pencil, Plus } from '@lucide/svelte';

	let data = $derived(await getColors());

	type Color = (typeof data.colors)[number];
	type Group = (typeof data.groups)[number];

	/** The colour being edited; without `color`, a new one in `groupId`. */
	let editingColor = $state<{ color?: Color; groupId: string | null }>();
	/** The edited colour's hex and code, which typing NCS into the colour field fills in. */
	let hex = $state('');
	let code = $state('');
	/** The group being edited; an empty object while adding one. */
	let editingGroup = $state<{ group?: Group }>();

	let sections = $derived(sectionsByGroup(data.groups, data.colors));

	function editColor(color: Color | undefined, groupId: string | null) {
		editingColor = { color, groupId };
		hex = color?.hex ?? '#8f2f2b';
		code = color?.code ?? '';
	}

	// Hex, rgb() and hsl() leave the code alone; NCS becomes it, and stops being it once changed.
	const isNcs = (text: string | undefined) => !!text?.startsWith('NCS');
	function setEnteredCode(entered: string | undefined) {
		if (isNcs(entered)) code = entered!;
		else if (isNcs(code)) code = '';
	}
</script>

<header class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold tracking-tight">Colours</h1>
	<div class="flex flex-wrap items-center gap-2">
		<ImportExport table="colors" title="Import colours" form={importColors} />
		<Button size="sm" onclick={() => (editingGroup = {})}>
			<FolderPlus class="size-3.5" />
			New group
		</Button>
		<Button size="sm" variant="primary" onclick={() => editColor(undefined, null)}>
			<Plus class="size-3.5" />
			New colour
		</Button>
	</div>
</header>

<div class="space-y-4">
	{#each sections as section (section.group?.id ?? null)}
		{@const name = section.group?.name ?? 'Other'}
		<Card class="overflow-hidden">
			<header class="flex items-center gap-3 border-b border-white/8 py-2 pr-2 pl-4">
				<h2 class="min-w-0 truncate text-sm font-semibold">{name}</h2>
				<span class="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/55 tabular-nums">
					{section.items.length} colours
				</span>
				<span class="flex-1"></span>
				{#if section.group}
					{@const group = section.group}
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
					aria-label="Add colour to {name}"
					title="Add colour to {name}"
					onclick={() => editColor(undefined, section.group?.id ?? null)}
				>
					<Plus class="size-4" />
				</Button>
			</header>

			{#if section.items.length}
				<div class="grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each section.items as color (color.id)}
						<button
							type="button"
							onclick={() => editColor(color, color.groupId)}
							class="flex min-w-0 items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/6"
						>
							<span class="size-9 shrink-0 rounded-xl chip" style:background-color={color.hex}
							></span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium">
									{color.name}
								</span>
								<span class="block truncate font-mono text-[11px] text-white/45">
									{color.code ?? color.hex}
								</span>
							</span>
						</button>
					{/each}
				</div>
			{:else}
				<p class="px-4 py-3 text-sm text-white/45">Nothing here yet.</p>
			{/if}
		</Card>
	{:else}
		<Card padding="sm"><p class="text-sm text-white/55">Nothing here yet.</p></Card>
	{/each}
</div>

{#if editingColor}
	{@const color = editingColor.color}
	{@const siblings = data.colors.filter((row) => row.groupId === editingColor?.groupId)}
	{@const form = saveColor.for(color?.id ?? '')}
	<EntryDialog
		title={color ? 'Edit colour' : 'New colour'}
		{form}
		id={color?.id}
		ondelete={color && (() => deleteColor(color.id))}
		onclose={() => (editingColor = undefined)}
	>
		<NameField field={form.fields.name} value={color?.name} />
		<div class="grid gap-3 sm:grid-cols-2">
			<GroupField field={form.fields.groupId} groups={data.groups} value={editingColor.groupId} />
			<label class="block text-xs font-medium text-white/60">
				Code
				<Input
					{...form.fields.code.as('text')}
					bind:value={code}
					placeholder="e.g. NCS S 4050-Y80R"
					class="mt-1.5"
				/>
			</label>
		</div>
		<div class="flex flex-wrap items-end gap-5">
			<div class="min-w-56 flex-1 text-xs font-medium text-white/60">
				Colour
				<input {...form.fields.hex.as('hidden', hex)} />
				<ColorField
					bind:value={hex}
					bind:code={() => code, setEnteredCode}
					label="Colour"
					class="mt-1.5"
				/>
			</div>
			<SortField field={form.fields.sortOrder} value={color?.sortOrder ?? nextSort(siblings)} />
		</div>
	</EntryDialog>
{/if}

{#if editingGroup}
	{@const group = editingGroup.group}
	{@const form = saveColorGroup.for(group?.id ?? '')}
	<EntryDialog
		title={group ? 'Edit group' : 'New group'}
		{form}
		id={group?.id}
		ondelete={group && (() => deleteColorGroup(group.id))}
		invalidMessage="Please fill in a name."
		note="Deleting a group keeps its colours, without a group."
		onclose={() => (editingGroup = undefined)}
	>
		<div class="flex flex-wrap items-end gap-3">
			<label class="block min-w-48 flex-1 text-xs font-medium text-white/60">
				Group
				<Input
					{...form.fields.name.as('text', group?.name ?? '')}
					placeholder="e.g. Ottosson Linoljefärg"
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
