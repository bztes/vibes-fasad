<script lang="ts">
	import { resolve } from '$app/paths';
	import Swatches from '#lib/components/ui/Swatches.svelte';
	import { getColors } from '#lib/admin/colors.remote.ts';
	import { getPalettes } from '#lib/admin/palettes.remote.ts';
	import { getScenes } from '#lib/admin/scenes.remote.ts';
	import { isSceneReady } from '#lib/fasad/scene.ts';
	import { getUsers } from '#lib/admin/users.remote.ts';
	import { ArrowRight, Image, Palette, SwatchBook, Users } from '@lucide/svelte';

	let [scenes, palettes, colors, users] = $derived(
		await Promise.all([getScenes(), getPalettes(), getColors(), getUsers()])
	);

	let incomplete = $derived(scenes.scenes.filter((scene) => !isSceneReady(scene)).length);
</script>

{#snippet section(
	path: '/admin/scenes' | '/admin/palettes' | '/admin/colors' | '/admin/users',
	Icon: typeof Image,
	title: string,
	intro: string,
	stats: string[],
	warning?: string
)}
	<a
		href={resolve(path)}
		class="group flex flex-col gap-4 rounded-3xl glass p-5 transition hover:border-white/25 sm:p-6"
	>
		<span class="flex items-center gap-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-xl well text-primary-300">
				<Icon class="size-5" />
			</span>
			<span class="min-w-0 flex-1 text-lg font-semibold tracking-tight">{title}</span>
			<ArrowRight
				class="size-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70"
			/>
		</span>
		<span class="text-sm text-white/55">{intro}</span>
		<span class="mt-auto flex flex-wrap items-center gap-2 text-[11px]">
			{#each stats as stat (stat)}
				<span class="rounded-full bg-white/8 px-2 py-0.5 text-white/60 tabular-nums">{stat}</span>
			{/each}
			{#if warning}
				<span class="rounded-full bg-amber-300/10 px-2 py-0.5 text-amber-300 tabular-nums">
					{warning}
				</span>
			{/if}
		</span>
	</a>
{/snippet}

<header class="mb-6">
	<h1 class="text-2xl font-semibold tracking-tight">Admin</h1>
	<p class="mt-1 text-sm text-white/55">
		Manage what the studio offers: scenes to paint, predefined palettes and the colour catalogue,
		and who is an admin.
	</p>
</header>

<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
	{@render section(
		'/admin/scenes',
		Image,
		'Scenes',
		'Photos to paint, each with surfaces outlined by masks.',
		[`${scenes.scenes.length} scenes`, `${scenes.groups.length} groups`],
		incomplete ? `${incomplete} not ready` : undefined
	)}
	{@render section(
		'/admin/palettes',
		Palette,
		'Palettes',
		'Predefined colour combinations, offered when starting a project.',
		[`${palettes.palettes.length} palettes`, `${palettes.groups.length} groups`]
	)}
	{@render section(
		'/admin/colors',
		SwatchBook,
		'Colours',
		'The colours offered in the colour picker, by group.',
		[`${colors.colors.length} colours`, `${colors.groups.length} groups`]
	)}
	{@render section('/admin/users', Users, 'Users', 'Accounts and admins.', [
		`${users.users.length} users`,
		`${users.users.filter((user) => user.isAdmin).length} admins`
	])}
</div>

{#if scenes.scenes.length}
	<section class="mt-8">
		<h2 class="mb-3 text-sm font-semibold text-white/60">Scenes</h2>
		<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
			{#each scenes.scenes.slice(0, 6) as scene (scene.id)}
				<a
					href={resolve('/admin/scenes/[id]', { id: scene.id })}
					class="group overflow-hidden rounded-2xl glass p-1.5 transition hover:border-white/25"
					title={scene.name}
				>
					<img
						src={scene.photo}
						alt={scene.name}
						width={scene.width}
						height={scene.height}
						class="aspect-[4/5] w-full rounded-xl object-cover"
					/>
				</a>
			{/each}
		</div>
	</section>
{/if}

{#if palettes.palettes.length}
	<section class="mt-8">
		<h2 class="mb-3 text-sm font-semibold text-white/60">Palettes</h2>
		<a
			href={resolve('/admin/palettes')}
			class="flex flex-wrap gap-x-5 gap-y-3 rounded-3xl glass p-4 transition hover:border-white/25"
		>
			{#each palettes.palettes.slice(0, 12) as palette (palette.id)}
				<span title={palette.name}><Swatches colors={Object.values(palette.colors)} /></span>
			{/each}
		</a>
	</section>
{/if}
