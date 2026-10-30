<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import { untrack } from 'svelte';

	/** Asks for a name, e.g. when creating or renaming a project. */
	let {
		title,
		label,
		initial = '',
		submitLabel,
		onsubmit,
		onclose
	}: {
		title: string;
		label: string;
		initial?: string;
		submitLabel: string;
		onsubmit: (name: string) => void;
		onclose: () => void;
	} = $props();

	let name = $state(untrack(() => initial));
</script>

<Dialog {title} {onclose} class="max-w-sm">
	<form
		class="space-y-4"
		onsubmit={(event) => {
			event.preventDefault();
			if (name.trim()) onsubmit(name.trim());
		}}
	>
		<label class="block text-xs font-medium text-white/60">
			{label}
			<Input
				bind:value={name}
				required
				maxlength={120}
				class="mt-1.5"
				data-autofocus
				onfocus={(event) => event.currentTarget.select()}
			/>
		</label>
		<div class="flex justify-end gap-2">
			<Button onclick={onclose} variant="ghost">Cancel</Button>
			<Button type="submit" variant="primary" disabled={!name.trim()}>{submitLabel}</Button>
		</div>
	</form>
</Dialog>
