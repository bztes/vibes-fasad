<script lang="ts">
	import GroupCard from '#lib/components/fasad/GroupCard.svelte';
	import { getLibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { getHeldProjects, savedColors } from '#lib/fasad/project.svelte.ts';
	import { byName, groupColors } from '#lib/fasad/types.ts';
	import { Bookmark } from '@lucide/svelte';

	let data = $derived(await getCatalog());

	const held = getHeldProjects();
	const search = getLibrarySearch();

	let mine = $derived(
		savedColors(held())
			.toSorted(byName)
			.filter((color) => search.matches(color.name, color.code ?? null, color.hex))
	);
	let catalog = $derived(
		data.catalog.filter((color) => search.matches(color.name, color.code, color.hex, color.group))
	);
	// Each group opens on a page of its own; colours outside any group are under `other`.
	let groups = $derived(
		groupColors(catalog).map((group) => ({
			...group,
			path: `/library/colors/${group.colors[0].groupId ?? 'other'}`
		}))
	);
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
	<!-- The user's own come first, even while there are none, unless the search leaves none. -->
	{#if mine.length || !search.query}
		<GroupCard path="/library/colors/mine" name="My colours" count="{mine.length} colours">
			{#each mine.slice(0, 12) as color (color.id)}
				<span class="flex-1 chip" style:background-color={color.hex}></span>
			{:else}
				<span class="grid flex-1 place-items-center bg-white/5">
					<Bookmark class="size-6 text-white/25" />
				</span>
			{/each}
		</GroupCard>
	{/if}
	{#each groups as group (group.name)}
		<GroupCard path={group.path} name={group.name ?? 'Other'} count="{group.colors.length} colours">
			{#each group.colors.slice(0, 12) as color (color.id)}
				<span class="flex-1 chip" style:background-color={color.hex}></span>
			{/each}
		</GroupCard>
	{/each}
</div>
{#if search.query && !mine.length && !groups.length}
	<p class="rounded-3xl glass p-6 text-center text-sm text-white/55">
		No colours match your search.
	</p>
{/if}
