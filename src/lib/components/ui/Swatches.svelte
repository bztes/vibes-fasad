<script lang="ts">
	import { tv, type VariantProps } from 'tailwind-variants';

	const swatch = tv({
		base: 'chip rounded-full ring-2 ring-night-900/80',
		variants: { size: { sm: 'size-4', md: 'size-5', lg: 'size-7' } },
		defaultVariants: { size: 'md' }
	});

	/** Null shows an unpainted swatch. */
	let { colors, size }: { colors: (string | null)[] } & VariantProps<typeof swatch> = $props();
</script>

<span class="flex shrink-0 -space-x-1.5" aria-hidden="true">
	{#each colors as color, index (index)}
		<span class={[swatch({ size }), !color && 'bg-white/10']} style:background-color={color}></span>
	{/each}
</span>
