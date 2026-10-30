<script lang="ts">
	import type { RemoteFormField } from '$app/server';

	let { field, label, value }: { field: RemoteFormField<string>; label: string; value?: string } =
		$props();
</script>

<label class="text-[11px] font-medium text-white/55">
	{label}
	<input {...field.as('color', value)} class="color-well mt-1 block h-8 w-12 rounded-lg chip" />
</label>
