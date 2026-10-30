<script lang="ts">
	import { goto } from '$app/navigation';
	import { href } from '#lib/components/app/nav.svelte.ts';
	import SceneDialog from '#lib/components/fasad/SceneDialog.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import NameDialog from '#lib/components/ui/NameDialog.svelte';
	import { noticeAccount } from '#lib/fasad/project.svelte.ts';
	import { createProject } from '#lib/fasad/projects.remote.ts';
	import type { Scene, SceneGroup } from '#lib/fasad/types.ts';
	import { FolderPlus } from '@lucide/svelte';

	/** A button that creates a project and opens it, asking for its scenes and name. */
	let {
		scenes,
		groups,
		class: className
	}: { scenes: Scene[]; groups: SceneGroup[]; class?: string } = $props();

	let choosingScene = $state(false);
	let sceneIds = $state<string[] | null>(null);

	/** Asks for a scene first, unless there's only one to choose from. */
	function start() {
		if (scenes.length > 1) choosingScene = true;
		else sceneIds = [scenes[0].id];
	}

	/** The first project also makes the viewer's account, see `noticeAccount`. */
	async function create(name: string) {
		if (!sceneIds) return;
		const start = sceneIds;
		sceneIds = null;
		const created = noticeAccount(await createProject({ name, sceneIds: start, colors: {} }));
		goto(href(`/${created.id}`));
	}
</script>

<Button class={className} variant="primary" onclick={start}>
	<FolderPlus class="size-4" />
	New project
</Button>

{#if sceneIds}
	<NameDialog
		title="New project"
		label="Project name"
		submitLabel="Create project"
		onsubmit={create}
		onclose={() => (sceneIds = null)}
	/>
{/if}

{#if choosingScene}
	<SceneDialog
		{scenes}
		{groups}
		onpick={(picked) => {
			choosingScene = false;
			sceneIds = picked;
		}}
		onclose={() => (choosingScene = false)}
	/>
{/if}
