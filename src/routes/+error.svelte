<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · Fasad</title>
</svelte:head>

<main class="mx-auto max-w-sm p-4 pt-16 text-center lg:pt-32">
	<div class="rounded-3xl glass p-8">
		<p class="text-5xl font-semibold tracking-tight text-white/80">{page.status}</p>
		<p class="mt-2 text-sm text-white/55">{page.error?.message}</p>
	</div>
</main>
