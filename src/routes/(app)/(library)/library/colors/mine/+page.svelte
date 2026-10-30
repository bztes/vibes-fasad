<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import ColorTile from '#lib/components/fasad/ColorTile.svelte';
	import { getLibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import ConfirmDelete from '#lib/components/ui/ConfirmDelete.svelte';
	import CopyButton from '#lib/components/ui/CopyButton.svelte';
	import IconLink from '#lib/components/ui/IconLink.svelte';
	import Swatches from '#lib/components/ui/Swatches.svelte';
	import { access, edit, getHeldProjects } from '#lib/fasad/project.svelte.ts';
	import { deleteColor } from '#lib/fasad/projects.remote.ts';
	import { allows, byName } from '#lib/fasad/types.ts';
	import { ArrowLeft, FlaskConical, Pencil, SwatchBook } from '@lucide/svelte';

	const held = getHeldProjects();
	const search = getLibrarySearch();

	let count = $derived(held().reduce((sum, project) => sum + project.library.length, 0));
	/** The matching colours under the project they're saved in, for projects that have any. */
	let groups = $derived(
		held()
			.map((project) => ({
				project,
				colors: project.library
					.toSorted(byName)
					.filter((color) => search.matches(color.name, color.code ?? null, color.hex))
			}))
			.filter((group) => group.colors.length)
	);

	const emptyLink =
		'inline-flex h-8 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-xs font-medium hover:bg-white/14';
</script>

<a
	href={href('/library/colors')}
	class="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/55 hover:text-white"
>
	<ArrowLeft class="size-3.5" />
	All groups
</a>

<h2 class="mb-1 flex items-center gap-2 text-sm font-semibold">
	My colours
	<span class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
		{count}
	</span>
</h2>

{#each groups as { project, colors } (project.id)}
	{@const editable = allows(project.role, 'edit')}
	<h3 class="mt-5 mb-2 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
		Saved in {project.name}
	</h3>
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
		{#each colors as color (color.id)}
			<ColorTile hex={color.hex} code={color.code} name={color.name}>
				{#snippet meta()}
					{#if color.recipe.length}
						<span class="flex items-center gap-1.5">
							<Swatches size="sm" colors={color.recipe.map((part) => part.hex)} />
							{color.recipe.length}-colour mix
						</span>
					{/if}
				{/snippet}
				{#snippet actions()}
					<!-- Saved colours open in the mixer for editing. -->
					<IconLink label="Edit {color.name}" path="/mixer/{color.id}" icon={Pencil} />
					<CopyButton hex={color.hex} />
					{#if editable}
						<span class="ml-auto">
							<ConfirmDelete
								label="Delete {color.name}"
								ondelete={() =>
									edit(project, deleteColor({ ...access(project), colorId: color.id }))}
							/>
						</span>
					{/if}
				{/snippet}
			</ColorTile>
		{/each}
	</div>
{:else}
	<div class="mt-4 flex flex-col items-center rounded-3xl glass px-6 py-10 text-center">
		<SwatchBook class="mb-3 size-8 text-white/30" />
		<p class="text-sm text-white/60">
			{search.query
				? 'No colours match your search.'
				: 'No saved colours yet. Mix one, or save one from the catalogue.'}
		</p>
		{#if !search.query}
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				<a href={href('/mixer')} class={emptyLink}>
					<FlaskConical class="size-3.5" />
					New colour
				</a>
				<a href={href('/library/colors')} class={emptyLink}>
					<SwatchBook class="size-3.5" />
					All groups
				</a>
			</div>
		{/if}
	</div>
{/each}
