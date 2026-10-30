<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createPairing, getViewer, pairDevice } from '#lib/account.remote.ts';
	import DeviceList from '#lib/components/app/DeviceList.svelte';
	import RecoveryEmail from '#lib/components/app/RecoveryEmail.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { isKey } from '#lib/fasad/keys.ts';
	import { listProjects } from '#lib/fasad/project.svelte.ts';
	import { Check, Copy, Link, MonitorSmartphone } from '@lucide/svelte';

	let [viewer, projects] = $derived(await Promise.all([getViewer(), listProjects()]));

	/** The code of a device link that led here, see `createLink`. */
	const linked = page.url.hash.slice(1);
	let offered = $state(isKey(linked) ? linked : undefined);
	let busy = $state(false);
	let failed = $state(false);
	let link = $state<string>();
	let copied = $state(false);

	/** Adds this browser to the linked account, bringing along its own account's projects. */
	async function pair(code: string) {
		busy = true;
		failed = false;
		try {
			await pairDevice(code);
			await goto(resolve('/(app)'));
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	}

	/** Drops the link, also from the address bar. */
	function dismiss() {
		offered = undefined;
		failed = false;
		goto(resolve('/(account)/account'), { replaceState: true });
	}

	/** The code goes in the hash, which isn't sent to the server, or kept in its logs. */
	async function createLink() {
		busy = true;
		try {
			const { code } = await createPairing();
			link = `${page.url.origin}${resolve('/(account)/account')}#${code}`;
		} finally {
			busy = false;
		}
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard unavailable (e.g. insecure context): the link can still be selected.
		}
	}
</script>

<svelte:head>
	<title>Your account · Fasad</title>
</svelte:head>

<Card padding="md">
	{#if offered}
		<MonitorSmartphone class="mb-3 size-8 text-primary-300" />
		<h1 class="mb-2 text-xl font-semibold tracking-tight">Add this browser to your account?</h1>
		<p class="text-sm text-white/70">
			The link signs this browser in to your account, from your other device or a recovery e-mail.
			Its projects will show up here.
		</p>
		{#if projects.length}
			<p class="mt-2 text-xs text-white/50">
				The {projects.length} projects of this browser's own account move to it.
			</p>
		{/if}
		{#if failed}
			<p class="mt-3 rounded-xl bg-danger-500/20 px-3 py-2 text-xs text-danger-300">
				That link has expired or was used already. Create a new one on your other device.
			</p>
		{/if}
		<div class="mt-5 flex flex-wrap items-center gap-2">
			<Button variant="primary" disabled={busy || failed} onclick={() => pair(offered!)}>
				Add this browser
			</Button>
			<Button variant="ghost" onclick={dismiss}>Cancel</Button>
		</div>
	{:else}
		<h1 class="mb-2 text-xl font-semibold tracking-tight">Your account</h1>
		{#if viewer.user}
			<p class="text-sm text-white/70">
				There's no sign-in: this browser got an account of its own with your first project, and it
				keeps the links to your projects.
			</p>

			<h2 class="mt-5 text-sm font-semibold">Devices</h2>
			<DeviceList />

			<h2 class="mt-5 text-sm font-semibold">Add a device</h2>
			<p class="mt-1 mb-2 text-xs text-white/55">
				Create a link and open it on your other device to work on the same projects there. Each
				device signs in on its own, and you can remove it in the list above.
			</p>
			{#if link}
				<div class="flex items-center gap-1.5">
					<Input
						readonly
						value={link}
						aria-label="Copy link"
						class="min-w-0 flex-1 font-mono text-xs"
						onfocus={(event) => event.currentTarget.select()}
					/>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Copy link"
						title="Copy link"
						onclick={() => copy(link!)}
					>
						{#if copied}<Check class="size-4 text-primary-300" />{:else}<Copy class="size-4" />{/if}
					</Button>
				</div>
				<p class="mt-2 text-[11px] text-white/45">
					Works once, for 15 minutes. Whoever opens this link first gets into your account, so only
					open it yourself.
				</p>
			{:else}
				<Button size="sm" disabled={busy} onclick={createLink}>
					<Link class="size-3.5" />
					Create link
				</Button>
			{/if}

			{#if viewer.emailEnabled}
				<h2 class="mt-5 text-sm font-semibold">Recovery e-mail</h2>
				<p class="mt-1 mb-2 text-xs text-white/55">
					If you lose all your devices, a link sent to this address gets you back in. Only a
					fingerprint of the address is kept, not the address itself, so it can't be used for
					anything else.
				</p>
				<RecoveryEmail hint={viewer.emailHint} />
			{/if}

			<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
				<span class="font-mono text-[11px] text-white/40">
					Account code: {viewer.user.id.slice(0, 8)}
				</span>
				{#if viewer.isAdmin}
					<a class="text-sm font-medium text-primary-300 underline" href={resolve('/admin')}>
						Admin
					</a>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-white/70">
				This browser has no account yet. It gets one with your first project, or the first one you
				open from a link.
			</p>
		{/if}
		{#if viewer.emailEnabled}
			<a
				class="mt-4 block text-xs text-white/55 underline hover:text-white"
				href={resolve('/(account)/account/recover')}
			>
				Lost your devices? Recover by e-mail
			</a>
		{/if}
	{/if}
</Card>
