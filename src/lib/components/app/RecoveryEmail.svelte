<script lang="ts">
	import { removeRecoveryEmail, requestRecoveryEmail } from '#lib/account.remote.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { Mail, MailCheck } from '@lucide/svelte';

	/** The saved recovery e-mail, masked, see `maskEmail`. */
	let { hint }: { hint: string | null } = $props();

	let editing = $state(false);
	let address = $state('');
	/** The address a confirmation link was sent to, see `requestRecoveryEmail`. */
	let sentTo = $state<string>();
	let busy = $state(false);
	let failed = $state(false);

	async function send(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		failed = false;
		try {
			await requestRecoveryEmail(address);
			sentTo = address;
			address = '';
			editing = false;
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	}

	async function remove() {
		busy = true;
		try {
			await removeRecoveryEmail();
			sentTo = undefined;
		} finally {
			busy = false;
		}
	}
</script>

{#if hint && !editing}
	<div class="flex items-center gap-2 rounded-2xl well py-1 pr-1.5 pl-3">
		<MailCheck class="size-4 shrink-0 text-primary-300" />
		<span class="min-w-0 flex-1 truncate text-sm">{`Saved: ${hint}`}</span>
		<Button size="sm" variant="ghost" disabled={busy} onclick={() => (editing = true)}>
			Change
		</Button>
		<Button size="sm" variant="ghost" disabled={busy} onclick={remove}>Remove</Button>
	</div>
{:else}
	<form class="flex items-center gap-1.5" onsubmit={send}>
		<Input
			bind:value={address}
			type="email"
			required
			autocomplete="email"
			placeholder="you@example.com"
			aria-label="Recovery e-mail"
			class="flex-1"
			size="sm"
		/>
		<Button type="submit" size="sm" disabled={busy || !address}>
			<Mail class="size-3.5" />
			Send confirmation
		</Button>
	</form>
{/if}

{#if failed}
	<p class="mt-2 rounded-xl bg-danger-500/20 px-3 py-2 text-xs text-danger-300">
		Couldn't send the e-mail. Check the address, or try again later.
	</p>
{:else if sentTo}
	<p class="mt-2 text-[11px] text-white/55">
		We sent a link to {sentTo}. Open it within an hour to save the address.
	</p>
{/if}
