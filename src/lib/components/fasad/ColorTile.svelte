<script lang="ts">
	import { isLight } from '#lib/fasad/color.ts';
	import type { Snippet } from 'svelte';

	/** A colour card: large chip on top, details and actions below. */
	let {
		hex,
		code,
		name,
		meta,
		actions
	}: {
		hex: string;
		/** Shown on the chip instead of the hex, e.g. the NCS code it was entered as. */
		code?: string;
		name: string;
		meta?: Snippet;
		actions: Snippet;
	} = $props();
</script>

<article
	class="group relative flex flex-col rounded-3xl glass p-2 transition hover:border-white/20 has-[details[open]]:z-30"
>
	<div
		class="relative flex h-28 items-end rounded-[1.1rem] chip p-3 transition-colors"
		style:background-color={hex}
	>
		<span
			class="font-mono text-[11px] font-semibold {code ? '' : 'uppercase'} {isLight(hex)
				? 'text-night-950/70'
				: 'text-white/80'}">{code ?? hex}</span
		>
	</div>
	<div class="flex flex-1 flex-col px-1.5 pt-2.5 pb-1">
		<h3 class="truncate text-sm font-medium" title={name}>{name}</h3>
		<div class="mt-0.5 min-h-5 text-[11px] text-white/45">{@render meta?.()}</div>
		<div class="mt-2 flex items-center gap-0.5">{@render actions()}</div>
	</div>
</article>
