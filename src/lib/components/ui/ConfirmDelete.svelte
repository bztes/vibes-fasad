<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import { Trash } from '@lucide/svelte';

	/** Two-step delete: the icon turns into a "Delete?" button that confirms. */
	let { label, ondelete }: { label: string; ondelete: () => void } = $props();

	let confirming = $state(false);
</script>

{#if confirming}
	<Button
		size="sm"
		variant="danger"
		{@attach (element: HTMLElement) => element.focus()}
		onclick={ondelete}
		onblur={() => (confirming = false)}
	>
		Delete?
	</Button>
{:else}
	<Button
		size="icon-sm"
		variant="ghost"
		class="hover:bg-danger-500/20 hover:text-danger-300"
		aria-label={label}
		title={label}
		onclick={() => (confirming = true)}
	>
		<Trash class="size-4" />
	</Button>
{/if}
