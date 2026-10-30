<script lang="ts">
	import { normalizeColorInput } from '#lib/fasad/color-input.ts';

	/**
	 * Edits a hex colour through the native picker or typed hex, rgb(), hsl() or NCS codes.
	 * `code` holds the normalised notation it was entered in, e.g. `NCS S 1050-Y90R`.
	 */
	let {
		value = $bindable(),
		code = $bindable(),
		label,
		class: className = ''
	}: { value: string; code?: string; label: string; class?: string } = $props();

	let text = $state('');
	let focused = $state(false);
	let invalid = $derived(!!text.trim() && !normalizeColorInput(text));
	// Falls back to hex once the colour was changed elsewhere, e.g. by fine-tuning.
	let shown = $derived(
		code && normalizeColorInput(code)?.hex === value.toLowerCase() ? code : value.toUpperCase()
	);
</script>

<div class="flex h-11 items-center gap-2 rounded-xl well pr-1 pl-1.5 {className}">
	<input
		type="color"
		bind:value
		aria-label={label}
		class="color-well size-8 shrink-0 rounded-lg chip"
		oninput={(event) => (code = event.currentTarget.value.toUpperCase())}
	/>
	<input
		value={focused ? text : shown}
		placeholder="Hex, rgb, hsl or NCS"
		aria-label="Colour code"
		aria-invalid={invalid}
		spellcheck="false"
		autocomplete="off"
		class="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:font-sans placeholder:text-white/35 aria-invalid:text-danger-300"
		onfocus={() => {
			focused = true;
			text = shown;
		}}
		onblur={() => (focused = false)}
		oninput={(event) => {
			text = event.currentTarget.value;
			const parsed = normalizeColorInput(text);
			if (!parsed) return;
			value = parsed.hex;
			code = parsed.code;
		}}
	/>
</div>
