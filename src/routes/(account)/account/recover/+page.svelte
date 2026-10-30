<script lang="ts">
	import { resolve } from '$app/paths';
	import { recoverAccount } from '#lib/account.remote.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { LifeBuoy, Mail } from '@lucide/svelte';

	let address = $state('');
	/** The address a device link was asked for; the answer is the same whether it has an account. */
	let sentTo = $state<string>();
	let busy = $state(false);
	let failed = $state(false);

	async function send(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		failed = false;
		try {
			await recoverAccount(address);
			sentTo = address;
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Recover your account · Fasad</title>
</svelte:head>

<Card padding="md">
	<LifeBuoy class="mb-3 size-8 text-primary-300" />
	<h1 class="mb-2 text-xl font-semibold tracking-tight">Recover your account</h1>
	{#if sentTo}
		<p class="text-sm text-white/70">
			If {sentTo} is an account's recovery e-mail, a link is on its way. It works once, for 15 minutes.
		</p>
	{:else}
		<p class="mb-4 text-sm text-white/70">
			Enter your account's recovery e-mail, and we'll send a link that signs this browser in to it.
		</p>
		<form class="flex items-center gap-1.5" onsubmit={send}>
			<Input
				bind:value={address}
				type="email"
				required
				autocomplete="email"
				placeholder="you@example.com"
				aria-label="Recovery e-mail"
				class="flex-1"
			/>
			<Button type="submit" variant="primary" disabled={busy || !address}>
				<Mail class="size-4" />
				Send link
			</Button>
		</form>
		{#if failed}
			<p class="mt-3 rounded-xl bg-danger-500/20 px-3 py-2 text-xs text-danger-300">
				Too many attempts. Try again later.
			</p>
		{/if}
	{/if}
	<a
		class="mt-5 inline-block text-sm font-medium text-primary-300 underline"
		href={resolve('/(account)/account')}
	>
		Go to your account
	</a>
</Card>
