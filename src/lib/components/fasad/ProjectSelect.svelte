<script lang="ts">
	import { getNav } from '#lib/components/app/nav.svelte.ts';
	import { FolderOpen } from '@lucide/svelte';

	/** Picks the project new colours and palettes are saved into, see `Nav.target`. */
	let { class: className = '' }: { class?: string } = $props();

	const nav = getNav();
</script>

{#if nav.target}
	<label
		class="relative flex h-9 items-center gap-2 rounded-xl glass pr-2 pl-3 text-xs font-medium text-white/60 {className}"
	>
		<FolderOpen class="size-3.5 shrink-0 text-white/45" />
		<span class="shrink-0">Save to</span>
		<select
			class="min-w-0 flex-1 truncate bg-transparent text-sm text-white outline-none [&>option]:bg-night-950"
			value={nav.target.id}
			onchange={(event) =>
				(nav.target = nav.editable.find((project) => project.id === event.currentTarget.value))}
		>
			{#each nav.editable as project (project.id)}
				<option value={project.id}>{project.name}</option>
			{/each}
		</select>
	</label>
{:else}
	<p class="text-xs text-white/50 {className}">
		Create a project to save colours and palettes into.
	</p>
{/if}
