<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import ColorTile from '#lib/components/fasad/ColorTile.svelte';
	import { getLibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import CopyButton from '#lib/components/ui/CopyButton.svelte';
	import IconLink from '#lib/components/ui/IconLink.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { getNav } from '#lib/components/app/nav.svelte.ts';
	import { access, edit, getHeldProjects } from '#lib/fasad/project.svelte.ts';
	import { saveColor } from '#lib/fasad/projects.remote.ts';
	import { ArrowLeft, BookmarkPlus, Check, Pencil, SearchX } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let { catalog } = $derived(await getCatalog());

	const nav = getNav();
	const held = getHeldProjects();
	/** The project colours are saved into, picked in the library's header. */
	let target = $derived(held().find((project) => project.id === nav.target?.id));
	const search = getLibrarySearch();

	// `other` holds the colours outside any group.
	let groupId = $derived(params.group === 'other' ? null : params.group);
	let colors = $derived(catalog.filter((color) => color.groupId === groupId));
	let matching = $derived(
		colors.filter((color) => search.matches(color.name, color.code, color.hex))
	);

	let savedHexes = $derived(new Set(target?.library.map((color) => color.hex)));
</script>

<a
	href={href('/library/colors')}
	class="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/55 hover:text-white"
>
	<ArrowLeft class="size-3.5" />
	All groups
</a>

{#if !colors.length}
	<div class="flex flex-col items-center rounded-3xl glass px-6 py-12 text-center">
		<SearchX class="mb-3 size-8 text-white/30" />
		<p class="text-sm text-white/60">This group wasn't found. It may have been deleted.</p>
	</div>
{:else}
	<h2 class="mb-3 flex items-center gap-2 text-sm font-semibold">
		{colors[0].group ?? 'Other'}
		<span class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
			{colors.length}
		</span>
	</h2>
	{#if matching.length}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each matching as color (color.id)}
				<ColorTile hex={color.hex} name={color.name}>
					{#snippet meta()}{color.code ?? ''}{/snippet}
					{#snippet actions()}
						<!-- Catalogue colours open in the mixer as a fresh mix. -->
						<IconLink
							label="Edit {color.name}"
							path="/mixer?color={encodeURIComponent(color.id)}"
							icon={Pencil}
						/>
						<CopyButton hex={color.hex} />
						{#if !target}
							<!-- There's no project to save into. -->
						{:else if savedHexes.has(color.hex)}
							<span
								class="ml-auto grid size-8 place-items-center text-primary-300"
								title="In my colours"
							>
								<Check class="size-4" />
							</span>
						{:else}
							<span class="ml-auto">
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Save to my colours"
									title="Save to my colours"
									onclick={() =>
										edit(
											target,
											saveColor({
												...access(target),
												name: color.name,
												hex: color.hex,
												recipe: []
											})
										)}
								>
									<BookmarkPlus class="size-4" />
								</Button>
							</span>
						{/if}
					{/snippet}
				</ColorTile>
			{/each}
		</div>
	{:else}
		<p class="rounded-3xl glass p-6 text-center text-sm text-white/55">
			No colours match your search.
		</p>
	{/if}
{/if}
