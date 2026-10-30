<script lang="ts">
	import { href, isUnder } from '#lib/components/app/nav.svelte.ts';
	import { LibrarySearch, setLibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import ProjectSelect from '#lib/components/fasad/ProjectSelect.svelte';
	import { button } from '#lib/components/ui/Button.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { getHeldProjects, savedColors } from '#lib/fasad/project.svelte.ts';
	import { page } from '$app/state';
	import { Palette, Plus, Search, SwatchBook } from '@lucide/svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const held = getHeldProjects();
	const search = setLibrarySearch(new LibrarySearch());

	let { catalog, presets } = $derived(await getCatalog());

	// Each tab is a page of its own, so it can be linked to and the back button returns to it.
	let tabs = $derived([
		{
			path: '/library/colors',
			label: 'Colours',
			icon: SwatchBook,
			count: savedColors(held()).length + catalog.length,
			create: { path: '/mixer', label: 'New colour', icon: Plus }
		},
		{
			path: '/library/palettes',
			label: 'Palettes',
			icon: Palette,
			count: held().flatMap((project) => project.palettes).length + presets.length,
			create: { path: '/palette', label: 'New palette', icon: Plus }
		}
	]);

	// A group's page sits under its tab.
	const isCurrent = (path: string) => isUnder(page.url.pathname, path);
	let currentTab = $derived(tabs.find((tab) => isCurrent(tab.path)));
</script>

<svelte:head>
	<title>Colours & palettes · Fasad</title>
</svelte:head>

<main class="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase">Library</p>
			<h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Colours & palettes</h1>
			<p class="mt-2 max-w-2xl text-sm text-white/55">
				Colours and palettes saved in your projects, next to the colour catalogue. Paint them
				straight onto the house or take them back to the mixer.
			</p>
		</div>
		<div class="flex w-full flex-wrap gap-2 sm:w-auto">
			<label class="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-white/35"
				/>
				<Input
					bind:value={search.query}
					type="search"
					placeholder="Search colours and palettes"
					class="glass pl-9"
				/>
			</label>
			<!-- Where the bookmarked catalogue colours and palettes go. -->
			<ProjectSelect class="w-full sm:w-56" />
			{#if currentTab}
				{@const create = currentTab.create}
				<a href={href(create.path)} class={button({ variant: 'primary' })}>
					<create.icon class="size-4" />
					{create.label}
				</a>
			{/if}
		</div>
	</header>

	<nav
		class="mb-6 flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full glass p-1"
		aria-label="Colours & palettes"
	>
		{#each tabs as tab (tab.path)}
			<a
				href={href(tab.path)}
				aria-current={isCurrent(tab.path) ? 'page' : undefined}
				class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:text-white"
			>
				<tab.icon class="size-3.5" />
				{tab.label}
				<span class="rounded-full bg-white/10 px-1.5 text-[10px] text-white/60">{tab.count}</span>
			</a>
		{/each}
	</nav>

	{@render children()}
</main>
