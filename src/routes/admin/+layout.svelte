<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Ambient from '#lib/components/app/Ambient.svelte';
	import { href, isUnder } from '#lib/components/app/nav.svelte.ts';
	import { AMBIENT_COLORS } from '#lib/fasad/defaults.ts';
	import { ArrowLeft, Image, Palette, ShieldCheck, SwatchBook, Users } from '@lucide/svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: '/admin/scenes', label: 'Scenes', icon: Image },
		{ href: '/admin/palettes', label: 'Palettes', icon: Palette },
		{ href: '/admin/colors', label: 'Colours', icon: SwatchBook },
		{ href: '/admin/users', label: 'Users', icon: Users }
	];

	const isCurrent = (path: string) => isUnder(page.url.pathname, path);
</script>

<svelte:head>
	<title>Admin · Fasad</title>
</svelte:head>

<!-- Leads to the overview. -->
{#snippet title()}
	<a
		href={resolve('/admin')}
		aria-current={page.url.pathname === '/admin' ? 'page' : undefined}
		class="group flex items-center gap-3 rounded-2xl"
	>
		<span
			class="grid size-9 shrink-0 place-items-center rounded-xl well text-primary-300 transition group-hover:text-primary-200"
		>
			<ShieldCheck class="size-[18px]" />
		</span>
		<span class="leading-tight">
			<span class="block text-base font-semibold tracking-tight">Admin</span>
			<span class="block text-[11px] text-white/50 transition group-hover:text-white/70">
				Fasad
			</span>
		</span>
	</a>
{/snippet}

<Ambient colors={AMBIENT_COLORS} />

<!-- Desktop: floating glass sidebar, like the studio's -->
<aside
	class="fixed inset-y-4 left-4 z-30 hidden w-60 flex-col rounded-[1.75rem] glass p-4 lg:flex"
	aria-label="Admin"
>
	<div class="px-2 pt-1 pb-6">{@render title()}</div>

	<nav class="space-y-1">
		{#each links as link (link.href)}
			<a
				href={href(link.href)}
				aria-current={isCurrent(link.href) ? 'page' : undefined}
				class="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/6 hover:text-white aria-[current]:bg-white/12 aria-[current]:text-white aria-[current]:shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]"
			>
				<link.icon
					class="size-[18px] text-white/45 transition group-hover:text-white/80 group-aria-[current]:text-primary-300"
				/>
				{link.label}
			</a>
		{/each}
	</nav>

	<div class="mt-auto">
		<a
			href={href('/')}
			class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/6 hover:text-white"
		>
			<ArrowLeft class="size-[18px] text-white/45" />
			Back to studio
		</a>
	</div>
</aside>

<!-- Mobile: header with the sections as tabs underneath -->
<header
	class="sticky top-0 z-30 space-y-3 rounded-none border-x-0 border-t-0 glass px-4 py-3 lg:hidden"
>
	<div class="flex items-center justify-between gap-2">
		{@render title()}
		<a
			href={href('/')}
			class="grid size-8 place-items-center rounded-lg text-white/50 hover:text-white"
			aria-label="Back to studio"
			title="Back to studio"
		>
			<ArrowLeft class="size-4" />
		</a>
	</div>
	<nav class="-mx-1 flex gap-1 overflow-x-auto text-sm" aria-label="Admin">
		{#each links as link (link.href)}
			<a
				href={href(link.href)}
				aria-current={isCurrent(link.href) ? 'page' : undefined}
				class="flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 font-medium text-white/60 transition hover:text-white aria-[current]:bg-white/14 aria-[current]:text-white"
			>
				<link.icon class="size-4" />
				{link.label}
			</a>
		{/each}
	</nav>
</header>

<div class="min-h-dvh lg:pl-68">
	<main class="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
		{@render children()}
	</main>
</div>
