<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import { getLibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import PaletteStrip from '#lib/components/fasad/PaletteStrip.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { getNav } from '#lib/components/app/nav.svelte.ts';
	import { access, edit, getHeldProjects } from '#lib/fasad/project.svelte.ts';
	import { savePalette } from '#lib/fasad/projects.remote.ts';
	import type { PartColors } from '#lib/fasad/types.ts';
	import { ArrowLeft, BookmarkPlus, Check, SearchX } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let data = $derived(await getCatalog());

	const nav = getNav();
	const held = getHeldProjects();
	/** The project palettes are saved into, picked in the library's header. */
	let target = $derived(held().find((project) => project.id === nav.target?.id));
	const search = getLibrarySearch();

	// `other` holds the palettes outside any group.
	let groupId = $derived(params.group === 'other' ? null : params.group);
	let presets = $derived(data.presets.filter((preset) => preset.groupId === groupId));
	let groups = $derived(search.byScene(data.scenes, presets));

	/** Compares palettes by their colours, whatever order the parts were saved in. */
	const colorsKey = (colors: PartColors) =>
		JSON.stringify(Object.entries(colors).toSorted(([a], [b]) => a.localeCompare(b)));
	let saved = $derived(new Set(target?.palettes.map((palette) => colorsKey(palette.colors))));
</script>

<a
	href={href('/library/palettes')}
	class="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/55 hover:text-white"
>
	<ArrowLeft class="size-3.5" />
	All groups
</a>

{#if !presets.length}
	<div class="flex flex-col items-center rounded-3xl glass px-6 py-12 text-center">
		<SearchX class="mb-3 size-8 text-white/30" />
		<p class="text-sm text-white/60">This group wasn't found. It may have been deleted.</p>
	</div>
{:else}
	<h2 class="mb-3 flex items-center gap-2 text-sm font-semibold">
		{presets[0].group ?? 'Other'}
		<span class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
			{presets.length}
		</span>
	</h2>
	{#each groups as { scene, palettes } (scene.id)}
		{#if data.scenes.length > 1}
			<h3
				class="mt-5 mb-2 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase first:mt-0"
			>
				{scene.name}
			</h3>
		{/if}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each palettes as preset (preset.id)}
				<article class="flex flex-col rounded-2xl glass p-1.5">
					<PaletteStrip {scene} colors={preset.colors} class="h-16 overflow-hidden rounded-xl" />
					<div class="flex items-center gap-1 pt-1">
						<h4 class="min-w-0 flex-1 truncate px-1.5 text-xs font-medium" title={preset.name}>
							{preset.name}
						</h4>
						{#if !target}
							<!-- There's no project to save into. -->
						{:else if saved.has(colorsKey(preset.colors))}
							<span
								class="grid size-8 shrink-0 place-items-center text-primary-300"
								title="In my palettes"
							>
								<Check class="size-4" />
							</span>
						{:else}
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Save to my palettes"
								title="Save to my palettes"
								onclick={() =>
									edit(
										target,
										savePalette({ ...access(target), name: preset.name, colors: preset.colors })
									)}
							>
								<BookmarkPlus class="size-4" />
							</Button>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<p class="rounded-3xl glass p-6 text-center text-sm text-white/55">
			No palettes match your search.
		</p>
	{/each}
{/if}
