<script lang="ts">
	import { logoIcon } from '#lib/components/app/logo.ts';
	import { AMBIENT_COLORS } from '#lib/fasad/defaults.ts';
	import './layout.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={logoIcon(AMBIENT_COLORS)} />
	<meta
		name="description"
		content="Mix colours, save them and plan facade projects with a live preview of window sashes, trim and siding."
	/>
	<meta name="theme-color" content="#090b0a" />
</svelte:head>

{@render children()}
