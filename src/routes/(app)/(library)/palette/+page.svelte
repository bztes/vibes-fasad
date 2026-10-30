<script lang="ts">
	import EditorPage from '#lib/components/fasad/EditorPage.svelte';
	import PaletteEditor from '#lib/components/fasad/PaletteEditor.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';

	let { catalog, scenes } = $derived(await getCatalog());
</script>

<EditorPage
	title="New palette"
	intro="Pick a colour for each surface of a scene and see it on the house as you go."
>
	<PaletteEditor {scenes} {catalog} />
</EditorPage>
