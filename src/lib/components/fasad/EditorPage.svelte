<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import { ArrowLeft, SearchX } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	/** Frames the colour and palette editors; `found: false` says what's edited is gone. */
	let {
		title,
		intro,
		found = true,
		notFound,
		children
	}: {
		title: string;
		intro: string;
		found?: boolean;
		notFound?: string;
		children: Snippet;
	} = $props();

	let library = $derived(href('/library'));
</script>

<svelte:head>
	<title>{title} · Fasad</title>
</svelte:head>

<main class="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
	<header class="mb-6">
		<a
			href={library}
			class="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase hover:text-white/80"
		>
			<ArrowLeft class="size-3.5" />
			Library
		</a>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
		<p class="mt-2 max-w-2xl text-sm text-white/55">{intro}</p>
	</header>

	{#if !found}
		<div class="flex flex-col items-center rounded-3xl glass px-6 py-12 text-center">
			<SearchX class="mb-3 size-8 text-white/30" />
			<p class="text-sm text-white/60">{notFound}</p>
			<a
				href={library}
				class="mt-4 inline-flex h-8 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-xs font-medium hover:bg-white/14"
			>
				<ArrowLeft class="size-3.5" />
				Back to the library
			</a>
		</div>
	{:else}
		{@render children()}
	{/if}
</main>
