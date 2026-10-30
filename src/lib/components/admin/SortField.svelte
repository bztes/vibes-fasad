<script lang="ts">
	import Input from '#lib/components/ui/Input.svelte';
	import type { RemoteFormField } from '$app/server';

	let { field, value = 0 }: { field: RemoteFormField<number>; value?: number } = $props();
</script>

<label class="block w-24 text-xs font-medium text-white/60">
	Order
	<Input {...field.as('number', value)} step="1" class="mt-1.5" />
</label>
