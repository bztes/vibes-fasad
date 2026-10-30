<script lang="ts">
	import { isLight } from '#lib/fasad/color.ts';
	import { partIcon } from '#lib/fasad/labels.ts';
	import type { CatalogColor, PartColors, Scene } from '#lib/fasad/types.ts';

	/** The scene's colours as large swatches, one per part; picking one mixes for it. */
	let {
		scene,
		colors,
		catalog,
		onpick,
		selected,
		class: className = ''
	}: {
		scene: Scene;
		colors: PartColors;
		catalog: CatalogColor[];
		onpick?: (layer: string) => void;
		/** Layer of the part whose swatch is marked as picked. */
		selected?: string;
		class?: string;
	} = $props();

	let byHex = $derived(new Map(catalog.map((color) => [color.hex.toLowerCase(), color])));
</script>

<!-- Swatches stack while narrow, e.g. next to other scenes' on a phone. -->
<div class="@container {className}">
	<figure
		class="flex size-full flex-col gap-2 @md:flex-row"
		aria-label="Colours of {scene.name} as swatches"
	>
		{#each scene.parts as part, index (part.id)}
			{@const Icon = partIcon(part.icon)}
			{@const hex = colors[part.layer]}
			{@const color = hex && byHex.get(hex.toLowerCase())}
			<button
				class="flex min-h-0 min-w-0 flex-col justify-end overflow-hidden rounded-2xl chip p-2.5 text-left transition-[background-color,filter] duration-300 hover:brightness-105 @md:p-3 {index
					? 'flex-1'
					: 'flex-[2]'} {hex && isLight(hex) ? 'text-night-950/80' : 'text-white/90'} {hex
					? ''
					: 'bg-white/10'} {part.layer === selected
					? 'ring-2 ring-primary-300 ring-offset-2 ring-offset-night-950'
					: ''}"
				style:background-color={hex}
				aria-pressed={selected === undefined ? undefined : part.layer === selected}
				aria-label="Mix colour for {part.name.toLowerCase()}"
				onclick={() => onpick?.(part.layer)}
			>
				<span class="flex items-center gap-1.5 truncate text-sm font-semibold">
					<Icon class="size-3.5 shrink-0 opacity-70" />
					{part.name}
				</span>
				{#if color}
					<span class="truncate text-xs opacity-75">
						{color.code ? `${color.code} · ` : ''}{color.name}
					</span>
				{/if}
				<span class="font-mono text-[11px] uppercase opacity-60">{hex ?? '—'}</span>
			</button>
		{/each}
	</figure>
</div>
