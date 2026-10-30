<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import ConfirmDelete from '#lib/components/ui/ConfirmDelete.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { timeAgo } from '#lib/fasad/format.ts';
	import { KEY_PARAM } from '#lib/fasad/keys.ts';
	import { access } from '#lib/fasad/project.svelte.ts';
	import { createKey, getKeys, revokeKey } from '#lib/fasad/projects.remote.ts';
	import { ROLES, type ProjectSummary, type Role } from '#lib/fasad/types.ts';
	import { Check, Copy, Crown, Eye, Pencil, Plus } from '@lucide/svelte';
	import type { Component } from 'svelte';

	/** The project's links to hand out or revoke, for one of its owners. */
	let { project, onclose }: { project: ProjectSummary; onclose: () => void } = $props();

	/** Those handed out, without ours, which an owner can't revoke. */
	let keys = $derived((await getKeys(access(project))).filter((key) => key.key !== project.key));
	let label = $state('');
	let role = $state<Role>('edit');
	let busy = $state(false);
	let failed = $state(false);
	let copied = $state<string | null>(null);

	const roles: Record<Role, { icon: Component; name: string; hint: string }> = {
		view: {
			icon: Eye,
			name: 'View',
			hint: 'Can look at the project and try colours, without saving them.'
		},
		edit: { icon: Pencil, name: 'Edit', hint: 'Can change the project.' },
		owner: {
			icon: Crown,
			name: 'Owner',
			hint: "Can change the project, make and revoke links, also other owners', and delete it."
		}
	};

	let projectUrl = $derived(
		new URL(resolve('/(app)/[id=uuid]', { id: project.id }), page.url.origin).href
	);
	const link = (key: string) => `${projectUrl}?${KEY_PARAM}=${encodeURIComponent(key)}`;

	/** Runs a call to the server, showing that it failed instead of throwing. */
	async function attempt(task: () => Promise<void>) {
		busy = true;
		failed = false;
		try {
			await task();
		} catch (error) {
			console.error(error);
			failed = true;
		} finally {
			busy = false;
		}
	}

	function create(event: SubmitEvent) {
		event.preventDefault();
		attempt(async () => {
			const created = await createKey({ ...access(project), label: label.trim(), role });
			label = '';
			copy(link(created.key));
		});
	}

	function revoke(keyId: string) {
		attempt(async () => {
			await revokeKey({ ...access(project), keyId });
		});
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = text;
			setTimeout(() => (copied = null), 1500);
		} catch {
			// Clipboard unavailable (e.g. insecure context): the link can still be selected.
		}
	}
</script>

{#snippet linkRow(text: string, copyLabel: string)}
	<div class="flex items-center gap-1.5">
		<Input
			readonly
			value={text}
			aria-label={copyLabel}
			class="min-w-0 flex-1 font-mono text-xs"
			onfocus={(event) => event.currentTarget.select()}
		/>
		<Button
			size="icon-sm"
			variant="ghost"
			aria-label={copyLabel}
			title={copyLabel}
			onclick={() => copy(text)}
		>
			{#if copied === text}<Check class="size-4 text-primary-300" />{:else}<Copy
					class="size-4"
				/>{/if}
		</Button>
	</div>
{/snippet}

<Dialog title="Share {project.name}" {onclose}>
	<p class="mb-4 text-xs text-white/50">
		Each link opens the project for whoever has it, as far as its role allows. Make one per person,
		so you can revoke it on its own.
	</p>

	{#if keys.length}
		<ul class="space-y-3">
			{#each keys as key (key.id)}
				{@const Icon = roles[key.role].icon}
				<li class="rounded-2xl well p-2.5">
					<div class="mb-1.5 flex items-center justify-between gap-2 px-0.5">
						<span class="flex min-w-0 items-center gap-1.5 text-xs font-medium">
							<span class="truncate">{key.label || 'Unnamed link'}</span>
							<span
								class="flex shrink-0 items-center gap-1 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] text-white/65"
							>
								<Icon class="size-3" />
								{roles[key.role].name}
							</span>
						</span>
						<span class="flex shrink-0 items-center gap-1 text-[11px] text-white/40">
							created {timeAgo(key.createdAt)}
							<ConfirmDelete
								label="Revoke {key.label || 'Unnamed link'}"
								ondelete={() => revoke(key.id)}
							/>
						</span>
					</div>
					{@render linkRow(link(key.key), 'Copy link')}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-xs text-white/45">No links yet.</p>
	{/if}

	{#if failed}
		<p class="mt-3 rounded-xl bg-danger-500/20 px-3 py-2 text-xs text-danger-300">
			The links couldn't be loaded or changed. Try again in a moment.
		</p>
	{/if}

	<form class="mt-5 space-y-3" onsubmit={create}>
		<label class="block text-xs font-medium text-white/60">
			New link for
			<Input bind:value={label} maxlength={80} placeholder="e.g. Anna" class="mt-1.5" />
		</label>
		<fieldset>
			<legend class="text-xs font-medium text-white/60">Role</legend>
			<div class="mt-1.5 grid grid-cols-3 gap-1.5">
				{#each ROLES as option (option)}
					{@const Icon = roles[option].icon}
					<label
						class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition has-focus-visible:border-primary-300/60 {role ===
						option
							? 'border-primary-300/50 bg-primary-300/10 text-white'
							: 'border-white/10 text-white/60 hover:border-white/20'}"
					>
						<input type="radio" class="sr-only" bind:group={role} value={option} />
						<Icon class="size-4" />
						{roles[option].name}
					</label>
				{/each}
			</div>
			<p class="mt-1.5 text-[11px] text-white/45">{roles[role].hint}</p>
		</fieldset>
		<Button type="submit" disabled={busy} class="w-full">
			<Plus class="size-4" />
			Create
		</Button>
	</form>
</Dialog>
