<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import { access, listProjects, setOpenProject } from '#lib/fasad/project.svelte.ts';
	import { getProject } from '#lib/fasad/projects.remote.ts';
	import { ArrowLeft, SearchX } from '@lucide/svelte';
	import type { LayoutProps } from './$types';

	let { children, params }: LayoutProps = $props();

	// Contexts are set before the first `await`.
	setOpenProject(() => project!);

	// Only projects the viewer's account holds a key to can be opened.
	let summary = $derived((await listProjects()).find((project) => project.id === params.id));
	let project = $derived(summary && (await getProject(access(summary))));
</script>

{#if project}
	<!-- What was tried or mixed on one project doesn't carry over to the next. -->
	{#key project.id}
		{@render children()}
	{/key}
{:else}
	<main class="grid min-h-dvh place-items-center p-4">
		<div class="flex flex-col items-center rounded-3xl glass px-6 py-12 text-center">
			<SearchX class="mb-3 size-8 text-white/30" />
			<p class="text-sm text-white/60">
				This project wasn't found. It may have been deleted, or its link no longer works.
			</p>
			<a
				href={href('/')}
				class="mt-4 inline-flex h-8 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-xs font-medium hover:bg-white/14"
			>
				<ArrowLeft class="size-3.5" />
				Projects
			</a>
		</div>
	</main>
{/if}
