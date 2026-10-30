<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const button = tv({
		base: 'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
		variants: {
			variant: {
				primary:
					'border-transparent bg-white text-night-950 shadow-[0_8px_24px_-8px_rgb(255_255_255/0.45)] hover:bg-white/90',
				secondary:
					'border-white/10 bg-white/8 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] hover:border-white/20 hover:bg-white/14',
				ghost: 'border-transparent bg-transparent text-white/65 hover:bg-white/10 hover:text-white',
				danger:
					'border-danger-400/40 bg-danger-500/20 text-danger-300 hover:bg-danger-500/35 hover:text-white'
			},
			size: {
				sm: 'h-8 px-3 text-xs',
				md: 'h-10 px-4',
				icon: 'size-9 px-0',
				'icon-sm': 'size-8 rounded-lg px-0'
			}
		},
		defaultVariants: { variant: 'secondary', size: 'md' }
	});

	export type ButtonVariants = VariantProps<typeof button>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let {
		children,
		variant,
		size,
		class: className,
		type = 'button',
		...rest
	}: HTMLButtonAttributes & ButtonVariants & { children: Snippet; class?: string } = $props();
</script>

<button {type} class={button({ variant, size, class: className })} {...rest}>
	{@render children()}
</button>
