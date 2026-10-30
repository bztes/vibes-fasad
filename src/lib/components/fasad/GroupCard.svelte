<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import type { Snippet } from 'svelte';

	/** A group of the library's colours or palettes, opening on a page of its own. */
	let {
		path,
		name,
		count,
		children
	}: {
		path: string;
		name: string;
		/** How many it holds, e.g. "12 colours". */
		count: string;
		/** A glimpse of what it holds. */
		children: Snippet;
	} = $props();
</script>

<a href={href(path)} class="flex flex-col rounded-3xl glass p-2 transition hover:border-white/20">
	<div class="flex h-20 overflow-hidden rounded-[1.1rem]" aria-hidden="true">
		{@render children()}
	</div>
	<div class="flex items-baseline justify-between gap-2 px-1.5 pt-2.5 pb-1">
		<h3 class="truncate text-sm font-medium">{name}</h3>
		<span class="shrink-0 text-[11px] text-white/45">{count}</span>
	</div>
</a>
