<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import ConfirmDelete from '#lib/components/ui/ConfirmDelete.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { deleteUser, getUsers, setRole } from '#lib/admin/users.remote.ts';
	import { Search, Shield, ShieldOff } from '@lucide/svelte';

	let data = $derived(await getUsers());

	let filter = $state('');
	let users = $derived(
		data.users.filter((user) => user.code.startsWith(filter.trim().toLowerCase()))
	);

	const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
</script>

<header class="mb-6">
	<h1 class="text-2xl font-semibold tracking-tight">Users</h1>
	<p class="mt-1 text-sm text-white/55">
		Accounts are made on first use, with no sign-up or password: a browser gets one with its first
		project, and it keeps the links to its projects. Tell them apart by the code on their account
		page. The first account, made by opening the admin, is an admin. Accounts owning no project are
		deleted once unused for 90 days.
	</p>
</header>

<Card class="overflow-hidden">
	<header class="flex items-center gap-3 border-b border-white/8 py-2 pr-2 pl-4">
		<h2 class="text-sm font-semibold">Accounts</h2>
		<span class="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/55 tabular-nums">
			{data.users.length}
		</span>
		<span class="flex-1"></span>
		<label class="relative w-48">
			<Search class="absolute top-2 left-2.5 size-4 text-white/35" />
			<Input
				bind:value={filter}
				size="sm"
				placeholder="Code"
				aria-label="Search by code"
				class="pl-8"
			/>
		</label>
	</header>

	<ul class="divide-y divide-white/6">
		{#each users as user (user.id)}
			<li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<span class="truncate font-mono text-sm font-medium">{user.code}</span>
						{#if user.isMe}
							<span class="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/60">You</span>
						{/if}
						{#if user.isAdmin}
							<span class="rounded-full bg-primary-300/15 px-2 py-0.5 text-[11px] text-primary-300">
								Admin
							</span>
						{/if}
					</div>
					<p class="mt-0.5 text-[11px] text-white/45 tabular-nums">
						Joined {date.format(user.createdAt)}
						· {user.projects} project links · {user.devices} devices{user.lastSeenAt
							? `, last seen ${date.format(user.lastSeenAt)}`
							: ''}
					</p>
				</div>

				{#if !user.isMe}
					<div class="flex items-center gap-1">
						{#if user.role === 'admin'}
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Remove admin"
								title="Remove admin"
								onclick={() => setRole({ id: user.id, role: 'user' })}
							>
								<ShieldOff class="size-4" />
							</Button>
						{:else}
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Make admin"
								title="Make admin"
								onclick={() => setRole({ id: user.id, role: 'admin' })}
							>
								<Shield class="size-4" />
							</Button>
						{/if}
						<ConfirmDelete label="Delete {user.code}" ondelete={() => deleteUser(user.id)} />
					</div>
				{/if}
			</li>
		{:else}
			<li class="px-4 py-3 text-sm text-white/45">No one matches.</li>
		{/each}
	</ul>
</Card>
