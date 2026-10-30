<script lang="ts">
	import { tv, type VariantProps } from 'tailwind-variants';
	import type { HTMLInputAttributes } from 'svelte/elements';

	const input = tv({
		base: 'w-full min-w-0 rounded-xl border border-white/10 bg-black/25 px-3 text-white shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] outline-none transition placeholder:text-white/35 focus:border-primary-300/60 focus:bg-black/35 disabled:opacity-50',
		variants: {
			size: { sm: 'h-8 rounded-lg text-xs', md: 'h-10 text-sm' },
			mono: { true: 'font-mono uppercase' }
		},
		defaultVariants: { size: 'md' }
	});

	let {
		value = $bindable(),
		size,
		mono,
		class: className,
		...rest
	}: Omit<HTMLInputAttributes, 'size'> & VariantProps<typeof input> & { class?: string } = $props();
</script>

<input bind:value class={input({ size, mono, class: className })} {...rest} />
