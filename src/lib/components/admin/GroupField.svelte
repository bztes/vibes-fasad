<script lang="ts">
	import type { SceneGroup } from '#lib/fasad/types.ts';
	import type { RemoteFormField } from '$app/server';

	/** The entry's group, e.g. a scene's; empty for none. */
	let {
		field,
		groups,
		value = null
	}: { field: RemoteFormField<string>; groups: SceneGroup[]; value?: string | null } = $props();
</script>

<label class="block text-xs font-medium text-white/60">
	Group
	<select
		{...field.as('select', value ?? '')}
		class="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white"
	>
		<option value="">No group</option>
		{#each groups as group (group.id)}
			<option value={group.id}>{group.name}</option>
		{/each}
	</select>
</label>
