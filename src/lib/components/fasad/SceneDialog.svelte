<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import type { Scene, SceneGroup } from '#lib/fasad/types.ts';
	import { Layers } from '@lucide/svelte';

	/** Asks which scenes to paint, one or a whole group, e.g. for a new project. */
	let {
		scenes,
		groups,
		title = 'New project',
		subtitle = 'Pick a scene to paint, or a whole group of them.',
		onpick,
		onclose
	}: {
		/** Those to choose from, e.g. without the ones already open. */
		scenes: Scene[];
		groups: SceneGroup[];
		title?: string;
		subtitle?: string;
		onpick: (sceneIds: string[]) => void;
		onclose: () => void;
	} = $props();

	// Each group with scenes to choose, then the scenes on their own.
	let sections = $derived(
		[
			...groups.map((group) => ({
				group,
				scenes: scenes.filter((scene) => scene.groupId === group.id)
			})),
			{
				group: undefined,
				scenes: scenes.filter((scene) => !groups.some((group) => group.id === scene.groupId))
			}
		].filter((section) => section.scenes.length)
	);
</script>

<Dialog {title} {subtitle} {onclose} class="max-w-2xl">
	<div class="space-y-5">
		{#each sections as { group, scenes } (group?.id ?? '')}
			<section>
				{#if group}
					<div class="mb-2 flex items-center justify-between gap-2">
						<h3 class="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
							{group.name}
						</h3>
						{#if scenes.length > 1}
							<Button
								size="sm"
								variant="ghost"
								onclick={() => onpick(scenes.map((scene) => scene.id))}
							>
								<Layers class="size-3.5" />
								All {scenes.length}
							</Button>
						{/if}
					</div>
				{/if}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each scenes as scene (scene.id)}
						<button
							class="overflow-hidden rounded-2xl border border-white/6 bg-white/4 text-left transition hover:border-white/25"
							onclick={() => onpick([scene.id])}
						>
							<img
								src={scene.photo}
								alt=""
								width={scene.width}
								height={scene.height}
								class="aspect-[4/3] w-full object-cover"
							/>
							<span class="block truncate px-3 py-2 text-sm font-medium">{scene.name}</span>
						</button>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</Dialog>
