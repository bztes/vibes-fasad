<script lang="ts">
	import ColorEditor from '#lib/components/fasad/ColorEditor.svelte';
	import EditorPage from '#lib/components/fasad/EditorPage.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { getHeldProjects } from '#lib/fasad/project.svelte.ts';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let { catalog } = $derived(await getCatalog());

	const held = getHeldProjects();

	/** The colour, with the project it's saved in. */
	let color = $derived(
		held()
			.flatMap((project) => project.library.map((color) => ({ ...color, project })))
			.find((candidate) => candidate.id === params.color)
	);
</script>

<EditorPage
	title={color ? `Edit ${color.name}` : 'Edit colour'}
	intro="Mix colours into one of your own."
	found={!!color}
	notFound="This colour wasn't found. It may have been deleted."
>
	{#if color}
		{#key color.id}
			<ColorEditor {color} {catalog} />
		{/key}
	{/if}
</EditorPage>
