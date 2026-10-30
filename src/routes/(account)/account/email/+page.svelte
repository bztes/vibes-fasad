<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { confirmRecoveryEmail } from '#lib/account.remote.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { isKey } from '#lib/fasad/keys.ts';
	import { MailCheck } from '@lucide/svelte';

	/**
	 * The code of the confirmation link that led here, see `requestRecoveryEmail`. It's saved only
	 * once confirmed, not on opening, so a mail scanner opening the link doesn't use it up.
	 */
	const code = page.url.hash.slice(1);
	let status = $state<'offered' | 'saved' | 'failed'>(isKey(code) ? 'offered' : 'failed');
	let busy = $state(false);

	async function confirm() {
		busy = true;
		try {
			await confirmRecoveryEmail(code);
			status = 'saved';
		} catch {
			status = 'failed';
		} finally {
			busy = false;
		}
		// The code is used up either way: drop it from the address bar.
		goto(resolve('/(account)/account/email'), { replaceState: true });
	}
</script>

<svelte:head>
	<title>Recovery e-mail · Fasad</title>
</svelte:head>

<Card padding="md">
	<MailCheck class="mb-3 size-8 text-primary-300" />
	<h1 class="mb-2 text-xl font-semibold tracking-tight">Save your recovery e-mail?</h1>
	{#if status === 'offered'}
		<p class="text-sm text-white/70">
			This saves the address as the recovery e-mail of the account it was entered on. If another
			account had it, it moves here.
		</p>
		<div class="mt-5 flex flex-wrap items-center gap-2">
			<Button variant="primary" disabled={busy} onclick={confirm}>Save address</Button>
		</div>
	{:else}
		<p
			class={status === 'saved'
				? 'text-sm text-white/70'
				: 'rounded-xl bg-danger-500/20 px-3 py-2 text-xs text-danger-300'}
		>
			{status === 'saved'
				? 'Saved. A link sent to this address now gets you back into your account.'
				: 'That link has expired or was used already. Enter the address again on your account page.'}
		</p>
		<a
			class="mt-5 inline-block text-sm font-medium text-primary-300 underline"
			href={resolve('/(account)/account')}
		>
			Go to your account
		</a>
	{/if}
</Card>
