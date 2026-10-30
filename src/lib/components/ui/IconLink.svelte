<script lang="ts">
	import { href } from '#lib/components/app/nav.svelte.ts';
	import { button } from '#lib/components/ui/Button.svelte';
	import type { Pencil } from '@lucide/svelte';

	/** An icon-only ghost button that links to an app path. */
	let { label, path, icon: Icon }: { label: string; path: string; icon: typeof Pencil } = $props();
</script>

<a
	href={href(path)}
	class={button({ size: 'icon-sm', variant: 'ghost' })}
	aria-label={label}
	title={label}
>
	<Icon class="size-4" />
</a>
