<script lang="ts">
	import { isLight, mixColors, mixRing } from '#lib/fasad/color.ts';
	import type { MixPart } from '#lib/fasad/types.ts';
	import { FlaskConical } from '@lucide/svelte';
	import { tv, type VariantProps } from 'tailwind-variants';

	const tin = tv({
		slots: {
			ring: 'grid shrink-0 place-items-center rounded-full shadow-[0_20px_40px_-16px_rgb(0_0_0/0.7)]',
			code: 'font-mono font-semibold uppercase',
			empty: 'text-white/35'
		},
		variants: {
			size: {
				md: { ring: 'size-24 p-1.5', code: 'text-xs', empty: 'size-6' },
				lg: {
					ring: 'mx-auto aspect-square w-full max-w-64 p-3',
					code: 'text-sm',
					empty: 'size-10'
				}
			}
		},
		defaultVariants: { size: 'md' }
	});

	/** The mix as its result in a ring of its colours' proportions, like a tin of paint. */
	let { mix, size }: { mix: Pick<MixPart, 'hex' | 'parts'>[] } & VariantProps<typeof tin> =
		$props();

	let result = $derived(mixColors(mix));
	let styles = $derived(tin({ size }));
</script>

<div class={styles.ring()} style:background={mixRing(mix) ?? 'rgb(255 255 255 / 0.06)'}>
	<div
		class="grid size-full place-items-center rounded-full chip ring-2 ring-night-950/40 transition-colors duration-300"
		style:background-color={result ?? 'transparent'}
	>
		{#if result}
			<span class={[styles.code(), isLight(result) ? 'text-night-950/80' : 'text-white/90']}>
				{result}
			</span>
		{:else}
			<FlaskConical class={styles.empty()} />
		{/if}
	</div>
</div>
