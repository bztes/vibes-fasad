<script lang="ts">
	import { page } from '$app/state';
	import ColorEditor from '#lib/components/fasad/ColorEditor.svelte';
	import EditorPage from '#lib/components/fasad/EditorPage.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';

	let { catalog } = $derived(await getCatalog());

	// A catalogue colour opened in the mixer, as `?color=<id>`, starts the mix.
	let start = $derived(catalog.find((color) => color.id === page.url.searchParams.get('color')));
</script>

<EditorPage title="New colour" intro="Mix colours into one of your own.">
	{#key start}
		<ColorEditor {catalog} start={start && { ...start, code: start.code ?? undefined }} />
	{/key}
</EditorPage>
