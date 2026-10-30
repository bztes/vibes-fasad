<script lang="ts">
	import { getNav } from './nav.svelte.ts';

	const nav = getNav();

	let colors = $derived(nav.colors);
	/** The scene's colours for the three dots, repeated for scenes with fewer parts. */
	const dot = (index: number) => colors[index % colors.length];
</script>

<span class="relative size-9 shrink-0" aria-hidden="true">
	<span
		class="absolute top-0 left-0 size-6 rounded-full chip transition-colors duration-700"
		style:background-color={dot(0)}
	></span>
	<span
		class="absolute top-0 right-0 size-6 rounded-full chip mix-blend-screen transition-colors duration-700"
		style:background-color={dot(1)}
	></span>
	<span
		class="absolute bottom-0 left-1.5 size-6 rounded-full chip mix-blend-screen transition-colors duration-700"
		style:background-color={dot(2)}
	></span>
</span>
