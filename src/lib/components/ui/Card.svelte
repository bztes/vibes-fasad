<script lang="ts">
	import { tv, type VariantProps } from 'tailwind-variants';
	import type { Snippet } from 'svelte';

	const card = tv({
		base: 'glass rounded-3xl',
		variants: {
			padding: { none: '', sm: 'p-4', md: 'p-5 sm:p-6' }
		},
		defaultVariants: { padding: 'none' }
	});

	let {
		children,
		padding,
		class: className,
		...rest
	}: VariantProps<typeof card> & {
		children: Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

<section class={card({ padding, class: className })} {...rest}>
	{@render children()}
</section>
