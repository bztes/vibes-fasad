<script lang="ts">
	import { SceneCanvas } from '#lib/fasad/scene-canvas.svelte.ts';
	import type { PartColors, Scene } from '#lib/fasad/types.ts';
	import { LoaderCircle } from '@lucide/svelte';

	let {
		scene,
		colors,
		class: className = ''
	}: {
		scene: Scene;
		colors: PartColors;
		class?: string;
	} = $props();

	const preview = new SceneCanvas(() => ({ scene, colors }), { throttle: true });
</script>

<figure
	class="relative grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden rounded-[2rem] glass p-3 sm:p-4 {className}"
	aria-label="House colour preview"
>
	<canvas
		{@attach preview.setup}
		class="max-h-full max-w-full rounded-[1.4rem] object-contain shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] transition-opacity duration-700"
		class:opacity-0={!preview.layers}
		aria-label="House colour preview"
	></canvas>

	{#if preview.failed && !preview.layers}
		<div
			class="absolute max-w-sm rounded-2xl bg-danger-500/20 p-4 text-center text-sm text-danger-300"
		>
			The preview could not be loaded.
		</div>
	{:else if !preview.layers}
		<div class="absolute flex items-center gap-2 text-sm text-white/70">
			<LoaderCircle class="size-4 animate-spin" />
			Preparing colour layers…
		</div>
	{/if}
</figure>
