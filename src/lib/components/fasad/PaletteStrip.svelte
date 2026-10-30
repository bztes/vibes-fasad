<script lang="ts">
	import { partHexes } from '#lib/fasad/scene.ts';
	import type { PartColors, Scene } from '#lib/fasad/types.ts';

	/**
	 * A palette's colours side by side, each as wide as its part is large in the scene's photos,
	 * but never too thin to see; the first part (usually the facade) widest if none is measured.
	 */
	let {
		scene,
		colors,
		class: className = ''
	}: { scene: Scene; colors: PartColors; class?: string } = $props();

	const total = $derived(scene.parts.reduce((sum, part) => sum + part.area, 0));
	// Normalised, as grow factors summing to less than 1 leave the rest of the strip empty.
	const grow = (index: number) => (total > 0 ? scene.parts[index].area / total : index ? 1 : 3);
</script>

<span class="flex {className}" aria-hidden="true">
	{#each partHexes(scene, colors) as hex, index (index)}
		<span
			class={['min-w-2', !hex && 'bg-white/10']}
			style:flex-grow={grow(index)}
			style:background-color={hex}
		></span>
	{/each}
</span>
