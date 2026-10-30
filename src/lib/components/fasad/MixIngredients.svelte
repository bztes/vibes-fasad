<script lang="ts">
	import ColorPicker from '#lib/components/fasad/ColorPicker.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import type { CatalogColor, MixPart, SavedColor } from '#lib/fasad/types.ts';
	import { Minus, Plus, X } from '@lucide/svelte';

	/** The colours of a mix, each with its parts; tapping a colour's swatch swaps it for another. */
	let {
		mix = $bindable(),
		catalog,
		library
	}: { mix: MixPart[]; catalog: CatalogColor[]; library: SavedColor[] } = $props();

	let editing = $state<number | null>(null);

	let total = $derived(mix.reduce((sum, part) => sum + part.parts, 0));
</script>

<ul class="space-y-2">
	{#each mix as part, index (index)}
		<li class="rounded-2xl border border-white/6 bg-white/4 p-2.5">
			<div class="flex items-center gap-3">
				<button
					class="size-10 shrink-0 rounded-xl chip transition hover:scale-105"
					style:background-color={part.hex}
					aria-label="Change colour of {part.name}"
					title="Edit colour"
					onclick={() => (editing = index)}
				></button>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{part.name}</p>
					<p class="truncate text-[11px] text-white/45 tabular-nums">
						{[part.code, `${total ? Math.round((part.parts / total) * 100) : 0}% of the mix`]
							.filter(Boolean)
							.join(' · ')}
					</p>
				</div>
				<div class="flex items-center rounded-xl well">
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Less"
						disabled={part.parts <= 0}
						onclick={() => (part.parts = Math.max(0, part.parts - 1))}
					>
						<Minus class="size-3.5" />
					</Button>
					<span class="w-6 text-center font-mono text-sm tabular-nums">{part.parts}</span>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="More"
						onclick={() => (part.parts += 1)}
					>
						<Plus class="size-3.5" />
					</Button>
				</div>
				<Button
					size="icon-sm"
					variant="ghost"
					aria-label="Remove {part.name}"
					onclick={() => (mix = mix.toSpliced(index, 1))}
				>
					<X class="size-4" />
				</Button>
			</div>
			<input
				type="range"
				min="0"
				max={Math.max(20, part.parts)}
				step="1"
				bind:value={part.parts}
				class="slider mt-2"
				style:--track="linear-gradient(90deg, rgb(255 255 255 / 0.08), {part.hex})"
				aria-label="Parts of {part.name}"
			/>
		</li>
	{:else}
		<li
			class="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/50"
		>
			The tin is empty. Add a colour to start mixing.
		</li>
	{/each}
</ul>

{#if editing !== null && mix[editing]}
	{@const part = mix[editing]}
	<Dialog title="Edit colour" onclose={() => (editing = null)}>
		<ColorPicker
			{catalog}
			{library}
			initial={part.hex}
			current={part.hex}
			pickLabel="Save"
			onpick={({ name, hex, code }) => {
				if (name.trim()) part.name = name.trim();
				part.hex = hex.toLowerCase();
				part.code = code;
				editing = null;
			}}
		/>
	</Dialog>
{/if}
