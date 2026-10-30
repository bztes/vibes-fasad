<script lang="ts">
	import { SceneCanvas } from '#lib/fasad/scene-canvas.svelte.ts';
	import type { PartColors, Scene } from '#lib/fasad/types.ts';

	/** A small live render of a scene, e.g. for project cards. */
	let {
		scene,
		colors,
		class: className = ''
	}: { scene: Scene; colors: PartColors; class?: string } = $props();

	const thumb = new SceneCanvas(() => ({ scene, colors }), { maxWidth: 360 });
</script>

<canvas
	{@attach thumb.setup}
	class="bg-white/5 object-cover transition-opacity duration-500 {className}"
	class:opacity-0={!thumb.layers}
	style:aspect-ratio="{scene.width} / {scene.height}"
	aria-hidden="true"
></canvas>
