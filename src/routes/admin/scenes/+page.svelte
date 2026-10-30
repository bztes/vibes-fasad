<script lang="ts">
	import { resolve } from '$app/paths';
	import EntryDialog from '#lib/components/admin/EntryDialog.svelte';
	import ImportExport from '#lib/components/admin/ImportExport.svelte';
	import GroupField from '#lib/components/admin/GroupField.svelte';
	import NameField from '#lib/components/admin/NameField.svelte';
	import PhotoField from '#lib/components/admin/PhotoField.svelte';
	import SortField from '#lib/components/admin/SortField.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import {
		createScene,
		deleteSceneGroup,
		getScenes,
		importScenes,
		saveSceneGroup
	} from '#lib/admin/scenes.remote.ts';
	import { isSceneReady } from '#lib/fasad/scene.ts';
	import { nextSort } from '#lib/fasad/types.ts';
	import { FolderPlus, Pencil, Plus } from '@lucide/svelte';

	let data = $derived(await getScenes());

	type Group = (typeof data.groups)[number];

	let editing = $state<
		{ kind: 'scene'; groupId: string | null } | { kind: 'group'; group?: Group }
	>();

	// Each group with its scenes, then the scenes on their own; empty groups are shown too.
	let sections = $derived([
		...data.groups.map((group) => ({
			group,
			scenes: data.scenes.filter((scene) => scene.groupId === group.id)
		})),
		{ group: undefined, scenes: data.scenes.filter((scene) => !scene.groupId) }
	]);
</script>

<header class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Scenes</h1>
		<p class="mt-1 text-sm text-white/55">Photos to paint, each with surfaces outlined by masks.</p>
	</div>
	<div class="flex flex-wrap gap-2">
		<ImportExport table="scenes" title="Import scenes" form={importScenes} />
		<Button size="sm" onclick={() => (editing = { kind: 'group' })}>
			<FolderPlus class="size-3.5" />
			New group
		</Button>
		<Button
			size="sm"
			variant="primary"
			onclick={() => (editing = { kind: 'scene', groupId: null })}
		>
			<Plus class="size-3.5" />
			New scene
		</Button>
	</div>
</header>

{#if data.scenes.length || data.groups.length}
	<div class="space-y-8">
		{#each sections as { group, scenes } (group?.id ?? '')}
			{#if group || scenes.length}
				<section>
					{#if group}
						<h2 class="mb-3 flex items-center gap-1 text-sm font-semibold">
							{group.name}
							<span class="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60"
								>{scenes.length}</span
							>
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Edit group"
								title="Edit group"
								onclick={() => (editing = { kind: 'group', group })}
							>
								<Pencil class="size-3.5" />
							</Button>
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Add scene to {group.name}"
								title="Add scene to {group.name}"
								onclick={() => (editing = { kind: 'scene', groupId: group.id })}
							>
								<Plus class="size-3.5" />
							</Button>
						</h2>
					{:else if data.groups.length}
						<h2 class="mb-3 text-sm font-semibold text-white/60">Not in a group</h2>
					{/if}
					{#if scenes.length}
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
							{#each scenes as scene (scene.id)}
								<a
									href={resolve('/admin/scenes/[id]', { id: scene.id })}
									class="group overflow-hidden rounded-3xl glass p-2 transition hover:border-white/25"
								>
									<img
										src={scene.photo}
										alt=""
										width={scene.width}
										height={scene.height}
										class="aspect-[4/5] w-full rounded-2xl object-cover transition duration-500 group-hover:scale-[1.03]"
									/>
									<span class="block px-1.5 pt-2.5 pb-1">
										<span class="block truncate text-sm font-medium">{scene.name}</span>
										<span class="block text-[11px] text-white/45">
											{scene.parts.length} surfaces
										</span>
										{#if !isSceneReady(scene)}
											<span class="mt-1 block text-[11px] text-amber-300">
												Not ready: add a photo, surfaces and their masks.
											</span>
										{/if}
									</span>
								</a>
							{/each}
						</div>
					{:else}
						<Card padding="md"
							><p class="text-sm text-white/55">No scenes in this group yet.</p></Card
						>
					{/if}
				</section>
			{/if}
		{/each}
	</div>
{:else}
	<Card padding="md"><p class="text-sm text-white/55">Nothing here yet.</p></Card>
{/if}

{#if editing?.kind === 'scene'}
	{@const form = createScene.for('')}
	<EntryDialog
		title="New scene"
		{form}
		multipart
		invalidMessage="Please fill in a name and choose a photo."
		onclose={() => (editing = undefined)}
	>
		<NameField field={form.fields.name} />
		<GroupField field={form.fields.groupId} groups={data.groups} value={editing.groupId} />
		<PhotoField field={form.fields.photo} label="Photo" required />
		<SortField field={form.fields.sortOrder} value={nextSort(data.scenes)} />
	</EntryDialog>
{:else if editing?.kind === 'group'}
	{@const edited = editing.group}
	{@const form = saveSceneGroup.for(edited?.id ?? '')}
	<EntryDialog
		title={edited ? 'Edit group' : 'New group'}
		{form}
		id={edited?.id}
		ondelete={edited && (() => deleteSceneGroup(edited.id))}
		invalidMessage="Please fill in a name."
		note="Deleting a group keeps its scenes, on their own."
		onclose={() => (editing = undefined)}
	>
		<NameField field={form.fields.name} value={edited?.name} />
		<SortField field={form.fields.sortOrder} value={edited?.sortOrder ?? nextSort(data.groups)} />
	</EntryDialog>
{/if}
