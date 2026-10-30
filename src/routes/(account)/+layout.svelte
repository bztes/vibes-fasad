<script lang="ts">
	import { resolve } from '$app/paths';
	import Ambient from '#lib/components/app/Ambient.svelte';
	import { AMBIENT_COLORS } from '#lib/fasad/defaults.ts';
	import { ArrowLeft } from '@lucide/svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<Ambient colors={AMBIENT_COLORS} />

<!-- The account stands alone: no studio sidebar, just its card -->
<div class="flex min-h-dvh flex-col p-4">
	<header class="flex items-center justify-between gap-2">
		<a
			href={resolve('/(app)')}
			class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-white/60 transition hover:text-white"
		>
			<ArrowLeft class="size-4" />
			Back to studio
		</a>
	</header>

	<main class="mx-auto w-full max-w-sm flex-1 pt-12 lg:pt-24">
		<p class="mb-4 text-center text-sm font-semibold tracking-tight text-white/70">Fasad</p>
		{@render children()}
	</main>
</div>
