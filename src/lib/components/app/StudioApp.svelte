<script lang="ts">
	import { resolve } from '$app/paths';
	import AppNav from '#lib/components/app/AppNav.svelte';
	import { Nav, setNav, type Viewer } from '#lib/components/app/nav.svelte.ts';
	import Ambient from '#lib/components/app/Ambient.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { AMBIENT_COLORS } from '#lib/fasad/defaults.ts';
	import type { ProjectSummary, Scene } from '#lib/fasad/types.ts';
	import { ImageOff } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	/** The studio's frame, set up with the data the layout loaded; contexts can't wait for it. */
	let {
		scenes,
		viewer,
		projects,
		children
	}: { scenes: Scene[]; viewer: Viewer; projects: ProjectSummary[]; children: Snippet } = $props();

	const nav = setNav(
		new Nav(
			() => viewer,
			() => projects,
			() => scenes
		)
	);
</script>

<svelte:head>
	<link rel="icon" href={nav.favicon} />
</svelte:head>

{#if scenes.length}
	<Ambient colors={nav.colors} />

	<AppNav />

	<div
		class="min-h-[calc(100dvh-4rem)] pb-28 transition-[padding] duration-300 lg:min-h-dvh lg:pb-0 {nav.collapsed
			? 'lg:pl-28'
			: 'lg:pl-68'}"
	>
		{@render children()}
	</div>
{:else}
	<Ambient colors={AMBIENT_COLORS} />

	<main class="grid min-h-dvh place-items-center p-4">
		<Card padding="md" class="max-w-sm text-center">
			<ImageOff class="mx-auto mb-3 size-9 text-white/30" />
			<p class="font-medium">No scenes yet</p>
			<p class="mt-1 text-sm text-white/55">
				An admin needs to add a scene with a photo before the studio can be used.
			</p>
			{#if viewer.isAdmin}
				<a
					href={resolve('/admin/scenes')}
					class="mt-4 inline-block text-sm text-primary-200 hover:text-primary-100"
				>
					Scenes
				</a>
			{/if}
		</Card>
	</main>
{/if}
