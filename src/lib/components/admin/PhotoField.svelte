<script lang="ts">
	import type { RemoteFormField } from '$app/server';

	/** A photo upload showing the chosen photo and its size, or an OpenRaster file with masks. */
	let {
		field,
		label,
		required = false
	}: {
		field: RemoteFormField<File>;
		label: string;
		required?: boolean;
	} = $props();

	let size = $state<{ width: number; height: number }>();
	let preview = $state<string>();
	/** Whether the chosen file is layered, which browsers can't show. */
	let layered = $state(false);

	async function measure(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		size = preview = undefined;
		layered = !!file?.name.toLowerCase().endsWith('.ora');
		if (!file || layered) return;
		const bitmap = await createImageBitmap(file);
		size = { width: bitmap.width, height: bitmap.height };
		bitmap.close();
		preview = URL.createObjectURL(file);
	}

	// Frees each preview once it's replaced or the field goes away.
	$effect(() => {
		const url = preview;
		return () => url && URL.revokeObjectURL(url);
	});
</script>

<div class="flex items-start gap-3">
	{#if preview}
		<img src={preview} alt="" class="size-16 shrink-0 rounded-xl object-cover" />
	{/if}
	<label class="block min-w-0 flex-1 text-xs font-medium text-white/60">
		{label}
		<input
			{...field.as('file')}
			accept="image/png,image/jpeg,image/webp,image/openraster,.ora"
			{required}
			onchange={measure}
			class="mt-1.5 block w-full rounded-xl well text-xs text-white/70 file:mr-3 file:h-9 file:cursor-pointer file:border-0 file:bg-white/10 file:px-3 file:text-xs file:font-medium file:text-white hover:file:bg-white/16"
		/>
		<span class="mt-1 block font-normal text-white/40">
			{layered
				? 'Layered file: the bottom layer becomes the photo, layers named like a surface its mask.'
				: size
					? `${size.width} × ${size.height}`
					: 'PNG, JPEG or WebP, or OpenRaster (.ora) with masks'}
		</span>
	</label>
</div>
