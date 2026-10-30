<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import { X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	let {
		title,
		subtitle,
		onclose,
		children,
		class: className = 'max-w-lg'
	}: {
		title: string;
		subtitle?: string;
		onclose: () => void;
		children: Snippet;
		class?: string;
	} = $props();

	const id = $props.id();

	const open: Attachment<HTMLDialogElement> = (dialog) => {
		dialog.showModal();
		// showModal focuses the first control (the close button) unless a field asks for focus.
		dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
	};
</script>

<dialog
	{@attach open}
	{onclose}
	onclick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
	aria-labelledby="{id}-title"
	class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] animate-rise overflow-hidden rounded-3xl glass-strong p-0 text-white backdrop:bg-night-950/60 backdrop:backdrop-blur-sm {className}"
>
	<div class="flex max-h-[calc(100dvh-2rem)] flex-col">
		<header class="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
			<div>
				<h2 id="{id}-title" class="text-lg font-semibold tracking-tight">{title}</h2>
				{#if subtitle}<p class="mt-0.5 text-sm text-white/55">{subtitle}</p>{/if}
			</div>
			<form method="dialog">
				<Button type="submit" variant="ghost" size="icon-sm" aria-label="Close">
					<X class="size-4" />
				</Button>
			</form>
		</header>
		<div class="min-h-0 flex-1 overflow-auto px-6 pb-6">
			{@render children()}
		</div>
	</div>
</dialog>
