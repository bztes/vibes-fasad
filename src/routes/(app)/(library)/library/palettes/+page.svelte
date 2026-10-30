<script lang="ts">
	import GroupCard from '#lib/components/fasad/GroupCard.svelte';
	import { getLibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import PaletteStrip from '#lib/components/fasad/PaletteStrip.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { getHeldProjects } from '#lib/fasad/project.svelte.ts';
	import { sceneFor } from '#lib/fasad/scene.ts';
	import { groupBy, type PartColors } from '#lib/fasad/types.ts';
	import { Bookmark } from '@lucide/svelte';

	let { presets, scenes } = $derived(await getCatalog());

	const held = getHeldProjects();
	const search = getLibrarySearch();

	/** Palettes matching the search with the first scene they fit; those fitting none aren't shown. */
	function shown<T extends { id: string; name: string; colors: PartColors }>(
		palettes: T[],
		group = ''
	) {
		return palettes.flatMap((palette) => {
			const scene = sceneFor(scenes, palette.colors);
			return scene && search.matches(palette.name, group) ? [{ palette, scene }] : [];
		});
	}

	let mine = $derived(shown(held().flatMap((project) => project.palettes)));
	// Each group opens on a page of its own; palettes outside any group are under `other`.
	let groups = $derived(
		groupBy(
			presets.flatMap((preset) => shown([preset], preset.group ?? '')),
			({ palette }) => palette.group
		).map(({ key, items }) => ({
			name: key,
			palettes: items,
			path: `/library/palettes/${items[0].palette.groupId ?? 'other'}`
		}))
	);
</script>

{#snippet strips(palettes: ReturnType<typeof shown>)}
	<span class="flex flex-1 flex-col gap-px">
		{#each palettes.slice(0, 4) as { palette, scene } (palette.id)}
			<PaletteStrip {scene} colors={palette.colors} class="flex-1" />
		{/each}
	</span>
{/snippet}

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
	<!-- The user's own come first, even while there are none, unless the search leaves none. -->
	{#if mine.length || !search.query}
		<GroupCard path="/library/palettes/mine" name="My palettes" count="{mine.length} palettes">
			{#if mine.length}
				{@render strips(mine)}
			{:else}
				<span class="grid flex-1 place-items-center bg-white/5">
					<Bookmark class="size-6 text-white/25" />
				</span>
			{/if}
		</GroupCard>
	{/if}
	{#each groups as group (group.name)}
		<GroupCard
			path={group.path}
			name={group.name ?? 'Other'}
			count="{group.palettes.length} palettes"
		>
			{@render strips(group.palettes)}
		</GroupCard>
	{/each}
</div>
{#if search.query && !mine.length && !groups.length}
	<p class="rounded-3xl glass p-6 text-center text-sm text-white/55">
		No palettes match your search.
	</p>
{/if}
