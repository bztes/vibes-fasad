<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import { getLibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import PaletteStrip from '#lib/components/fasad/PaletteStrip.svelte';
	import ConfirmDelete from '#lib/components/ui/ConfirmDelete.svelte';
	import IconLink from '#lib/components/ui/IconLink.svelte';
	import { getCatalog } from '#lib/fasad/catalog.remote.ts';
	import { access, edit, getHeldProjects } from '#lib/fasad/project.svelte.ts';
	import { deletePalette } from '#lib/fasad/projects.remote.ts';
	import { sceneFor } from '#lib/fasad/scene.ts';
	import { allows } from '#lib/fasad/types.ts';
	import { ArrowLeft, Palette, Pencil } from '@lucide/svelte';

	let { scenes } = $derived(await getCatalog());

	const held = getHeldProjects();
	const search = getLibrarySearch();

	let count = $derived(held().reduce((sum, project) => sum + project.palettes.length, 0));
	/**
	 * The matching palettes, each with the first scene it fits, under the project they're saved in,
	 * for projects that have any.
	 */
	let groups = $derived(
		held()
			.map((project) => ({
				project,
				palettes: project.palettes.flatMap((palette) => {
					const scene = sceneFor(scenes, palette.colors);
					return scene && search.matches(palette.name) ? [{ palette, scene }] : [];
				})
			}))
			.filter((group) => group.palettes.length)
	);

	const emptyLink =
		'inline-flex h-8 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-xs font-medium hover:bg-white/14';
</script>

<a
	href={href('/library/palettes')}
	class="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/55 hover:text-white"
>
	<ArrowLeft class="size-3.5" />
	All groups
</a>

<h2 class="mb-1 flex items-center gap-2 text-sm font-semibold">
	My palettes
	<span class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
		{count}
	</span>
</h2>

{#each groups as { project, palettes } (project.id)}
	{@const editable = allows(project.role, 'edit')}
	<h3 class="mt-5 mb-2 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
		Saved in {project.name}
	</h3>
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
		{#each palettes as { palette, scene } (palette.id)}
			<article class="flex flex-col rounded-2xl glass p-1.5">
				<PaletteStrip {scene} colors={palette.colors} class="h-16 overflow-hidden rounded-xl" />
				<h4 class="truncate px-1.5 pt-2 text-xs font-medium" title={palette.name}>
					{palette.name}
				</h4>
				<div class="mt-1 flex items-center gap-0.5">
					<IconLink label="Edit {palette.name}" path="/palette/{palette.id}" icon={Pencil} />
					{#if editable}
						<span class="ml-auto">
							<ConfirmDelete
								label="Delete {palette.name}"
								ondelete={() =>
									edit(project, deletePalette({ ...access(project), paletteId: palette.id }))}
							/>
						</span>
					{/if}
				</div>
			</article>
		{/each}
	</div>
{:else}
	<div class="mt-4 flex flex-col items-center rounded-3xl glass px-6 py-10 text-center">
		<Palette class="mb-3 size-8 text-white/30" />
		<p class="text-sm text-white/60">
			{search.query
				? 'No palettes match your search.'
				: 'No saved palettes yet. Make one, or save a ready-made one from Palettes.'}
		</p>
		{#if !search.query}
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				<a href={href('/palette')} class={emptyLink}>
					<Pencil class="size-3.5" />
					New palette
				</a>
				<a href={href('/library/palettes')} class={emptyLink}>
					<Palette class="size-3.5" />
					All groups
				</a>
			</div>
		{/if}
	</div>
{/each}
