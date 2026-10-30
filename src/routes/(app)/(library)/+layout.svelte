<script lang="ts">
	import { access, listProjects, setHeldProjects } from '#lib/fasad/project.svelte.ts';
	import { getProject } from '#lib/fasad/projects.remote.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Contexts are set before the first `await`.
	setHeldProjects(() => held);

	// The library, mixer and palette editor aren't of one project: they show and save into any.
	let projects = $derived(await listProjects());
	let held = $derived(await Promise.all(projects.map((project) => getProject(access(project)))));
</script>

<!-- Reading `held` holds the children back until it's loaded: they read it through the context. -->
{#if held}
	{@render children()}
{/if}
