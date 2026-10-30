<script lang="ts">
	import Input from '#lib/components/ui/Input.svelte';
	import type { RemoteFormField } from '$app/server';

	/** One name; kept as entered, e.g. a colour's Swedish name. */
	let {
		field,
		value = '',
		label = 'Name',
		required = true,
		autofocus = true
	}: {
		field: RemoteFormField<string>;
		value?: string;
		label?: string;
		required?: boolean;
		autofocus?: boolean;
	} = $props();
</script>

<label class="block text-xs font-medium text-white/60">
	{label}
	<Input
		{...field.as('text', value)}
		{required}
		data-autofocus={autofocus || undefined}
		class="mt-1.5"
	/>
</label>
