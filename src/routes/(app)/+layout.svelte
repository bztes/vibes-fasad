<script lang="ts">
	import { getViewer } from '#lib/account.remote.ts';
	import StudioApp from '#lib/components/app/StudioApp.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { listProjects } from '#lib/fasad/project.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let [{ scenes }, viewer, projects] = $derived(
		await Promise.all([getCatalog(), getViewer(), listProjects()])
	);
</script>

<StudioApp {scenes} {viewer} {projects}>{@render children()}</StudioApp>
