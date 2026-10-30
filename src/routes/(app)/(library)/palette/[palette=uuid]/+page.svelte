<script lang="ts">
	import EditorPage from '#lib/components/fasad/EditorPage.svelte';
	import PaletteEditor from '#lib/components/fasad/PaletteEditor.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { getHeldProjects } from '#lib/fasad/project.svelte.ts';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let { catalog, scenes } = $derived(await getCatalog());

	const held = getHeldProjects();

	/** The palette, with the project it's saved in. */
	let palette = $derived(
		held()
			.flatMap((project) => project.palettes.map((palette) => ({ ...palette, project })))
			.find((candidate) => candidate.id === params.palette)
	);
</script>

<EditorPage
	title={palette ? `Edit ${palette.name}` : 'Edit palette'}
	intro="Pick a colour for each surface of a scene and see it on the house as you go."
	found={!!palette}
	notFound="This palette wasn't found. It may have been deleted."
>
	{#if palette}
		{#key palette.id}
			<PaletteEditor {palette} {scenes} {catalog} />
		{/key}
	{/if}
</EditorPage>
