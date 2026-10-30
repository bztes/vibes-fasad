<script lang="ts">
	import { CircleUser, Pin, PinOff, ShieldCheck, UserRound } from '@lucide/svelte';
	import LogoMark from './LogoMark.svelte';
	import { getNav, href } from './nav.svelte.ts';

	const nav = getNav();

	let collapsed = $derived(nav.collapsed);
</script>

{#snippet logo(compact = false)}
	<a href={href('/')} class="flex items-center gap-3" aria-label={compact ? 'Fasad' : undefined}>
		<LogoMark />
		{#if !compact}
			<span class="leading-tight">
				<span class="block text-base font-semibold tracking-tight">Fasad</span>
				<span class="block text-[11px] text-white/50">Facade colour studio</span>
			</span>
		{/if}
	</a>
{/snippet}

{#snippet account()}
	<a
		href={href('/account')}
		class="grid size-8 place-items-center rounded-lg transition hover:bg-white/10 hover:text-white {nav.hasAccount
			? 'text-primary-200'
			: 'text-white/50'}"
		title="Your account"
		aria-label="Your account"
	>
		{#if nav.hasAccount}<CircleUser class="size-4" />{:else}<UserRound class="size-4" />{/if}
	</a>
{/snippet}

<!-- Desktop: floating glass sidebar, or a slim icon rail when collapsed -->
<aside
	class="fixed inset-y-4 left-4 z-30 hidden flex-col rounded-[1.75rem] glass p-4 transition-[width] duration-300 lg:flex {collapsed
		? 'w-20'
		: 'w-60'}"
	aria-label="Main"
>
	<div class="flex pt-1 pb-6 {collapsed ? 'justify-center' : 'px-2'}">
		{@render logo(collapsed)}
	</div>

	<nav class="space-y-1">
		{#each nav.links as link (link.href)}
			<a
				href={href(link.href)}
				aria-current={nav.isCurrent(link.href) ? 'page' : undefined}
				title={collapsed ? link.label : undefined}
				aria-label={collapsed ? link.label : undefined}
				class="group flex items-center gap-3 rounded-2xl text-sm font-medium text-white/60 transition hover:bg-white/6 hover:text-white aria-[current]:bg-white/12 aria-[current]:text-white aria-[current]:shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] {collapsed
					? 'size-12 justify-center'
					: 'px-3 py-2.5'}"
			>
				<link.icon
					class="shrink-0 text-white/45 transition group-hover:text-white/80 group-aria-[current]:text-primary-300 {collapsed
						? 'size-[22px]'
						: 'size-[18px]'}"
				/>
				{#if !collapsed}{link.label}{/if}
			</a>
		{/each}
	</nav>

	<div class="mt-auto">
		<div class="flex items-center gap-1 {collapsed ? 'flex-col' : 'justify-end px-1'}">
			<div class="flex items-center gap-1" class:flex-col={collapsed}>
				{@render account()}
				{#if nav.isAdmin}
					<a
						href={href('/admin')}
						class="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
						title="Admin"
						aria-label="Admin"
					>
						<ShieldCheck class="size-4" />
					</a>
				{/if}
				<button
					type="button"
					onclick={() => nav.toggle()}
					class="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
					title={collapsed ? 'Pin sidebar' : 'Collapse sidebar'}
					aria-label={collapsed ? 'Pin sidebar' : 'Collapse sidebar'}
					aria-expanded={!collapsed}
				>
					{#if collapsed}
						<Pin class="size-4" />
					{:else}
						<PinOff class="size-4" />
					{/if}
				</button>
			</div>
		</div>
	</div>
</aside>

<!-- Mobile: compact header and bottom tab bar -->
<header
	class="sticky top-0 z-30 flex h-16 items-center justify-between rounded-none border-x-0 border-t-0 glass px-4 lg:hidden"
>
	{@render logo()}
	<div class="flex items-center gap-1">
		{@render account()}
		{#if nav.isAdmin}
			<a
				href={href('/admin')}
				class="grid size-8 place-items-center rounded-lg text-white/50 hover:text-white"
				aria-label="Admin"
			>
				<ShieldCheck class="size-4" />
			</a>
		{/if}
	</div>
</header>

<nav
	class="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid gap-1 rounded-3xl glass-strong p-1.5 lg:hidden"
	style:grid-template-columns="repeat({nav.tabs.length}, minmax(0, 1fr))"
	aria-label="Main"
>
	{#each nav.tabs as link (link.href)}
		<a
			href={href(link.href)}
			aria-current={nav.isCurrent(link.href) ? 'page' : undefined}
			class="flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium text-white/55 transition aria-[current]:bg-white/12 aria-[current]:text-white"
		>
			<link.icon class="size-5" />
			{link.label}
		</a>
	{/each}
</nav>
