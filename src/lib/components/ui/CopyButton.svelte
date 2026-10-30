<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import { Check, Copy } from '@lucide/svelte';

	/** Copies a colour's hex code, ticking briefly once it's on the clipboard. */
	let { hex }: { hex: string } = $props();

	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(hex.toUpperCase());
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard unavailable (e.g. insecure context): nothing to report.
		}
	}
</script>

<Button
	size="icon-sm"
	variant="ghost"
	aria-label="Copy hex code"
	title="Copy hex code"
	onclick={copy}
>
	{#if copied}<Check class="size-4 text-primary-300" />{:else}<Copy class="size-4" />{/if}
</Button>
