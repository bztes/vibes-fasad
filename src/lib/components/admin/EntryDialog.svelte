<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import { DUPLICATE } from '#lib/admin/issues.ts';
	import type { RemoteForm } from '$app/server';
	import { Trash } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		form,
		id,
		invalidMessage = 'Please fill in a name and valid hex colours.',
		note,
		multipart = false,
		ondelete,
		onclose,
		children
	}: {
		title: string;
		/** Saves the entry; posts `id` when editing. One instance per dialog, see `.for(...)`. */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: Omit<RemoteForm<any, unknown>, 'for'>;
		/** Omit to create a new entry. */
		id?: string;
		invalidMessage?: string;
		/** Shown above the buttons when editing, e.g. what deleting does. */
		note?: string;
		/** Set when the form has a file field. */
		multipart?: boolean;
		/** Deletes the entry being edited. */
		ondelete?: () => Promise<unknown>;
		onclose: () => void;
		children: Snippet;
	} = $props();

	let issues = $derived(form.fields.allIssues());
	/** Set when the server failed the request rather than turned the data down. */
	let failed = $state(false);
	let confirming = $state(false);
	let deleting = $state(false);
	let busy = $derived(!!form.pending || deleting);

	async function remove() {
		deleting = true;
		try {
			await ondelete?.();
			onclose();
		} catch {
			failed = true;
			confirming = false;
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog {title} {onclose} class="max-w-xl">
	<form
		{...form.enhance(async ({ submit }) => {
			failed = false;
			try {
				if (await submit()) onclose();
				else confirming = false;
			} catch {
				failed = true;
			}
		})}
		enctype={multipart ? 'multipart/form-data' : undefined}
		class="space-y-4"
	>
		{#if id}<input {...form.fields.id.as('hidden', id)} />{/if}

		{@render children()}

		{#if issues || failed}
			<p class="rounded-xl bg-danger-500/20 px-3 py-2 text-xs text-danger-300">
				{issues?.some((issue) => issue.message === DUPLICATE)
					? 'A group with this name already exists.'
					: invalidMessage}
			</p>
		{/if}
		{#if id && note}<p class="text-xs text-white/45">{note}</p>{/if}

		<div class="flex flex-wrap items-center gap-2 pt-1">
			{#if id && ondelete}
				<!-- Two steps: the first click arms the button, the second deletes. -->
				{#if confirming}
					<Button
						variant="danger"
						disabled={busy}
						{@attach (element: HTMLElement) => element.focus()}
						onblur={() => (confirming = false)}
						onclick={remove}
					>
						Delete?
					</Button>
				{:else}
					<Button
						variant="ghost"
						class="hover:bg-danger-500/20 hover:text-danger-300"
						onclick={() => (confirming = true)}
					>
						<Trash class="size-4" />
						Delete
					</Button>
				{/if}
			{/if}
			<span class="flex-1"></span>
			<Button variant="ghost" onclick={onclose}>Cancel</Button>
			<Button type="submit" variant="primary" disabled={busy}>
				{id ? 'Save' : 'Add'}
			</Button>
		</div>
	</form>
</Dialog>
