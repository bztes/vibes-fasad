<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import ColorField from '#lib/components/ui/ColorField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { LibrarySearch } from '#lib/components/fasad/library.svelte.ts';
	import { NO_ADJUST, adjust } from '#lib/fasad/color.ts';
	import {
		byName,
		groupColors,
		type CatalogColor,
		type MixAdjust,
		type Color,
		type SavedColor
	} from '#lib/fasad/types.ts';
	import { Check, RotateCcw, Search } from '@lucide/svelte';
	import { untrack } from 'svelte';

	type Tab = 'library' | 'catalog' | 'custom';

	let {
		catalog,
		library,
		initial = '#8f2f2b',
		current,
		pickLabel,
		onpick
	}: {
		catalog: CatalogColor[];
		/** The project's own colours. */
		library: SavedColor[];
		/** Starting value for the custom tab. */
		initial?: string;
		/** Highlights the colour already in use. */
		current?: string;
		pickLabel: string;
		onpick: (color: Color) => void;
	} = $props();

	/** Where colours can be picked from, in order. */
	const TABS: Tab[] = ['library', 'catalog', 'custom'];

	// Saved colours first, unless there are none yet.
	let tab = $state<Tab>(untrack(() => (library.length ? 'library' : 'catalog')));
	const search = new LibrarySearch();
	let custom = $state(untrack(() => initial));
	let customCode = $state<string>();
	let customName = $state('');
	let tune = $state<MixAdjust>({ ...NO_ADJUST });
	let tuned = $derived(adjust(custom, tune));
	// Fine-tuning moves the colour away from the code it was entered as.
	let tunedCode = $derived(
		!tune.lightness && !tune.saturation && !tune.warmth && customCode
			? customCode
			: tuned.toUpperCase()
	);

	const tunings: {
		key: keyof MixAdjust;
		label: string;
		low: string;
		high: string;
	}[] = [
		{ key: 'lightness', label: 'Lightness', low: 'Darker', high: 'Lighter' },
		{ key: 'saturation', label: 'Saturation', low: 'Muted', high: 'Vivid' },
		{ key: 'warmth', label: 'Warmth', low: 'Cooler', high: 'Warmer' }
	];

	function track(key: keyof MixAdjust) {
		const at = (value: number) => adjust(custom, { ...tune, [key]: value });
		return `linear-gradient(90deg, ${at(-100)}, ${at(0)}, ${at(100)})`;
	}

	const labels: Record<Tab, string> = {
		library: 'My colours',
		catalog: 'Colour catalogue',
		custom: 'Custom'
	};

	let options = $derived(
		(tab === 'library'
			? library.toSorted(byName).map((color) => ({
					id: color.id,
					name: color.name,
					hex: color.hex,
					pickCode: color.code,
					meta: color.recipe.length ? `${color.recipe.length}-colour mix` : (color.code ?? ''),
					group: null
				}))
			: catalog.map((color) => ({ ...color, pickCode: undefined, meta: color.code ?? '' }))
		).filter((option) => search.matches(option.name, option.meta, option.hex, option.group))
	);
	let groups = $derived(groupColors(options));
</script>

<div class="mb-4 grid grid-cols-3 gap-1 rounded-2xl well p-1" role="tablist">
	{#each TABS as id (id)}
		<button
			role="tab"
			aria-selected={tab === id}
			class="rounded-xl py-2 text-xs font-semibold text-white/55 transition hover:text-white aria-selected:bg-white/14 aria-selected:text-white aria-selected:shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]"
			onclick={() => (tab = id)}
		>
			{labels[id]}
		</button>
	{/each}
</div>

{#if tab === 'custom'}
	<form
		class="space-y-4"
		onsubmit={(event) => {
			event.preventDefault();
			onpick({ name: customName.trim() || tunedCode, hex: tuned, code: tunedCode });
		}}
	>
		<div
			class="h-32 rounded-2xl chip transition-colors"
			style:background-color={tuned}
			aria-hidden="true"
		></div>
		<div>
			<ColorField bind:value={custom} bind:code={customCode} label="Custom colour" />
			<p class="mt-2 text-xs text-white/45">
				Pick a colour, or type a hex, rgb(), hsl() or NCS code such as S 4050-Y80R.
			</p>
		</div>
		<label class="block text-xs font-medium text-white/60">
			Colour name
			<Input bind:value={customName} maxlength={120} placeholder={tunedCode} class="mt-1.5" />
		</label>
		<div class="space-y-4 border-t border-white/8 pt-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold">Fine-tune</h3>
				<Button
					size="sm"
					variant="ghost"
					disabled={!tune.lightness && !tune.saturation && !tune.warmth}
					onclick={() => (tune = { ...NO_ADJUST })}
				>
					<RotateCcw class="size-3.5" />
					Reset
				</Button>
			</div>
			{#each tunings as tuning (tuning.key)}
				<label class="block">
					<span class="mb-1.5 flex items-baseline justify-between text-xs">
						<span class="font-medium text-white/75">{tuning.label}</span>
						<span class="font-mono text-white/45 tabular-nums">
							{tune[tuning.key] > 0 ? '+' : ''}{tune[tuning.key]}
						</span>
					</span>
					<input
						type="range"
						min="-100"
						max="100"
						step="1"
						class="slider"
						style:--track={track(tuning.key)}
						bind:value={tune[tuning.key]}
						ondblclick={() => (tune[tuning.key] = 0)}
					/>
					<span class="mt-0.5 flex justify-between text-[10px] text-white/35">
						<span>{tuning.low}</span>
						<span>{tuning.high}</span>
					</span>
				</label>
			{/each}
		</div>
		<div class="flex justify-end">
			<Button type="submit" variant="primary">{pickLabel}</Button>
		</div>
	</form>
{:else}
	<label class="relative mb-3 block">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-white/35"
		/>
		<Input bind:value={search.query} placeholder="Search colours" class="pl-9" type="search" />
	</label>

	{#each groups as group (group.name)}
		{#if group.name || groups.length > 1}
			<h3
				class="mt-4 mb-2 px-1 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase first:mt-0"
			>
				{group.name ?? 'Other'}
			</h3>
		{/if}
		<div class="grid gap-2 sm:grid-cols-2">
			{#each group.colors as option (option.id)}
				{@const selected = option.hex === current}
				<button
					class="group flex items-center gap-3 rounded-2xl border border-white/6 bg-white/4 p-2 text-left transition hover:border-white/20 hover:bg-white/10 aria-pressed:border-primary-300/60 aria-pressed:bg-primary-300/10"
					aria-pressed={selected}
					onclick={() => onpick({ name: option.name, hex: option.hex, code: option.pickCode })}
				>
					<span
						class="grid size-11 shrink-0 place-items-center rounded-xl chip"
						style:background-color={option.hex}
					>
						{#if selected}<Check class="size-4 drop-shadow" />{/if}
					</span>
					<span class="min-w-0">
						<span class="block truncate text-sm font-medium">{option.name}</span>
						<span class="block truncate text-[11px] text-white/45">
							{[option.meta, option.hex.toUpperCase()].filter(Boolean).join(' · ')}
						</span>
					</span>
				</button>
			{/each}
		</div>
	{:else}
		<p
			class="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50"
		>
			{#if search.query}
				No colours match your search.
			{:else if tab === 'library'}
				You haven't saved any colours yet.
			{:else}
				No colours in the catalogue yet.
			{/if}
		</p>
	{/each}
{/if}
