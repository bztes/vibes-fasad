<script lang="ts">
	import { resolve } from '$app/paths';
	import Button, { button } from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import type { ImportResult } from '#lib/server/import-file.ts';
	import type { RemoteForm } from '$app/server';
	import { Check, Download, Upload } from '@lucide/svelte';

	let {
		table,
		title,
		form
	}: {
		/** Which catalogue table the page manages; picks the export to download. */
		table: 'palettes' | 'colors' | 'scenes';
		/** Title of the import dialog. */
		title: string;
		/** Imports the uploaded file into the page's tables. */
		form: RemoteForm<{ file?: File; mode?: 'merge' | 'replace' }, ImportResult>;
	} = $props();

	let result = $derived(form.result);

	let open = $state(false);

	const modes = [
		{
			value: 'merge' as const,
			label: 'Merge',
			hint: 'Update entries with a matching id and add the rest.'
		},
		{ value: 'replace' as const, label: 'Replace', hint: 'Delete all existing entries first.' }
	];

	// Scenes come as a zip with their photos and masks, the rest as JSON.
	let zip = $derived(table === 'scenes');

	const exports = {
		colors: resolve('/api/(admin)/export/colors.json'),
		palettes: resolve('/api/(admin)/export/palettes.json'),
		scenes: resolve('/api/(admin)/export/scenes.zip')
	};

	const errors = {
		missing: 'Choose a file to import.',
		zip: 'The file is not a ZIP with a scenes.json.',
		json: 'The file is not valid JSON.',
		invalid: 'The file does not match the expected format.'
	};
</script>

<div class="flex flex-wrap items-center gap-2">
	{#if result && 'imported' in result && !open}
		<p class="flex items-center gap-1.5 text-xs text-primary-200">
			<Check class="size-3.5" />
			Imported {result.imported} entries.
		</p>
	{/if}
	<Button size="sm" onclick={() => (open = true)}>
		<Upload class="size-3.5" />
		Import
	</Button>
	<!-- The endpoint answers with an attachment, so this only downloads. -->
	<a
		href={exports[table]}
		download
		title={zip ? 'Download as ZIP with an OpenRaster file per scene' : 'Download as JSON'}
		class={button({ size: 'sm' })}
	>
		<Download class="size-3.5" />
		Export
	</a>
</div>

{#if open}
	<Dialog
		{title}
		subtitle={zip
			? 'A ZIP file exported from this page: scenes.json next to an OpenRaster file (.ora) per scene.'
			: 'A JSON file exported from this page, or seed/palettes.json or seed/colors.json from the repository.'}
		onclose={() => (open = false)}
		class="max-w-md"
	>
		<form
			{...form.enhance(async ({ submit }) => {
				await submit();
				if (form.result && 'imported' in form.result) open = false;
			})}
			enctype="multipart/form-data"
			class="space-y-4"
		>
			<input
				{...form.fields.file.as('file')}
				accept={zip ? 'application/zip,.zip' : 'application/json,.json'}
				required
				data-autofocus
				class="block w-full rounded-xl well text-xs text-white/70 file:mr-3 file:h-9 file:cursor-pointer file:border-0 file:bg-white/10 file:px-3 file:text-xs file:font-medium file:text-white hover:file:bg-white/16"
			/>

			<fieldset class="space-y-2">
				{#each modes as option (option.value)}
					<label
						class="flex cursor-pointer gap-3 rounded-xl well px-3 py-2.5 text-sm has-checked:ring-1 has-checked:ring-primary-300/50"
					>
						<input
							{...form.fields.mode.as('radio', option.value, option.value === 'merge')}
							class="mt-0.5 accent-primary-400"
						/>
						<span>
							<span class="block font-medium">{option.label}</span>
							<span class="block text-xs text-white/55">{option.hint}</span>
						</span>
					</label>
				{/each}
			</fieldset>

			{#if result && 'importError' in result}
				<p class="rounded-xl bg-danger-500/20 px-3 py-2 text-xs text-danger-300">
					{errors[result.importError]}
					{#if result.detail}<code class="mt-1 block font-mono">{result.detail}</code>{/if}
				</p>
			{/if}

			<div class="flex justify-end">
				<Button type="submit" variant="primary" disabled={!!form.pending}>
					<Upload class="size-4" />
					Import
				</Button>
			</div>
		</form>
	</Dialog>
{/if}
