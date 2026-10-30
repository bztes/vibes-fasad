<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import EntryDialog from '#lib/components/admin/EntryDialog.svelte';
	import GroupField from '#lib/components/admin/GroupField.svelte';
	import NameField from '#lib/components/admin/NameField.svelte';
	import SortField from '#lib/components/admin/SortField.svelte';
	import Button, { button } from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import {
		deleteMask,
		deletePart,
		deleteScene,
		getScene,
		saveMask,
		savePart,
		saveScene,
		uploadPhoto
	} from '#lib/admin/scenes.remote.ts';
	import { partIcon, partIcons } from '#lib/fasad/labels.ts';
	import { maskColor } from '#lib/fasad/scene.ts';
	import { nextSort, PART_ICONS } from '#lib/fasad/types.ts';
	import {
		ArrowLeft,
		Download,
		Check,
		LoaderCircle,
		PanelRightClose,
		PanelRightOpen,
		Pencil,
		Plus,
		Trash2,
		Upload
	} from '@lucide/svelte';
	import type { RemoteFormEnhanceInstance } from '$app/server';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let data = $derived(await getScene(params.id));

	type Part = (typeof data.scene.parts)[number];

	let scene = $derived(data.scene);
	let group = $derived(data.groups.find((group) => group.id === scene.groupId));
	/** The part pointed at in the list, highlighted on the photo. */
	let hovered = $state<string>();
	/** The part whose mask is being uploaded or removed, or the scene while its photo is. */
	let busy = $state<string>();
	/** Whether the parts panel is folded away from the photo. */
	let collapsed = $state(false);

	let editing = $state<{ kind: 'scene' } | { kind: 'part'; part?: Part }>();

	/** Uploads to the part, or the scene for its photo, one at a time. */
	const upload =
		(key: string) =>
		async ({ submit }: RemoteFormEnhanceInstance) => {
			busy = key;
			try {
				await submit();
			} finally {
				busy = undefined;
			}
		};

	async function removeMask(partId: string) {
		busy = partId;
		try {
			await deleteMask({ sceneId: scene.id, partId });
		} finally {
			busy = undefined;
		}
	}

	async function removeScene() {
		await deleteScene(scene.id);
		await goto(resolve('/admin/scenes'));
	}
</script>

<svelte:head>
	<title>{scene.name} · Admin</title>
</svelte:head>

<!-- Fills the window below the layout's padding (and mobile header), so the page never scrolls -->
<div
	class="flex h-[calc(100dvh-9rem)] flex-col gap-3 sm:h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-4rem)]"
>
	<header class="flex flex-wrap items-center gap-x-3 gap-y-2">
		<a
			href={resolve('/admin/scenes')}
			class="grid size-8 place-items-center rounded-lg text-white/50 hover:text-white"
			aria-label="All scenes"
			title="All scenes"
		>
			<ArrowLeft class="size-4" />
		</a>
		<h1 class="flex min-w-0 items-center gap-1 text-xl font-semibold tracking-tight">
			<span class="truncate">{scene.name}</span>
			<Button
				size="icon-sm"
				variant="ghost"
				aria-label="Edit scene"
				title="Edit scene"
				onclick={() => (editing = { kind: 'scene' })}
			>
				<Pencil class="size-4" />
			</Button>
		</h1>

		{#if group}
			<span class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/60">
				{group.name}
			</span>
		{/if}
	</header>

	<Card padding="sm" class="relative min-h-0 flex-1">
		<!-- SVG masks read luminance times alpha, like the studio, and scale with the photo -->
		<svg
			viewBox="0 0 {scene.width} {scene.height}"
			class="size-full"
			role="img"
			aria-label={scene.name}
		>
			<defs>
				{#each scene.parts as part (part.id)}
					{#if part.mask}
						<mask id="mask-{part.id}" maskUnits="userSpaceOnUse">
							<image
								href={part.mask}
								width={scene.width}
								height={scene.height}
								preserveAspectRatio="none"
							/>
						</mask>
					{/if}
				{/each}
			</defs>
			<image href={scene.photo} width={scene.width} height={scene.height} />
			{#each scene.parts as part, index (part.id)}
				{#if part.mask}
					<rect
						width={scene.width}
						height={scene.height}
						fill={maskColor(index)}
						mask="url(#mask-{part.id})"
						opacity={hovered ? (hovered === part.id ? 0.85 : 0.15) : 0.55}
						class="transition-opacity"
					/>
				{/if}
			{/each}
		</svg>

		<!-- Floats over the photo; collapses to a pill to uncover it -->
		{#if collapsed}
			<button
				type="button"
				class="absolute top-6 right-6 flex items-center gap-2 rounded-xl glass-strong px-3 py-2 text-sm text-white/80 transition hover:text-white"
				aria-expanded="false"
				onclick={() => (collapsed = false)}
			>
				<PanelRightOpen class="size-4" />
				Surfaces
				<span class="text-white/45 tabular-nums">{scene.parts.length}</span>
			</button>
		{:else}
			{@const photoForm = uploadPhoto.for(scene.id)}
			<div
				class="absolute top-6 right-6 flex max-h-[calc(100%-3rem)] w-80 max-w-[calc(100%-3rem)] flex-col gap-1 overflow-y-auto rounded-2xl glass-strong p-2"
			>
				<div class="flex items-center gap-1 pb-1 pl-1.5">
					<h2 class="mr-auto text-xs font-medium text-white/60">Surfaces</h2>
					<!-- The endpoint answers with an attachment, so this only downloads. -->
					<a
						href={resolve('/api/(admin)/scene/[sceneId].ora', { sceneId: scene.id })}
						download
						title="Download this scene as OpenRaster (.ora) for GIMP or Krita: the photo with a layer per mask, named after its surface. Edit the masks and upload the file again to bring them back."
						class={button({ size: 'sm', variant: 'ghost' })}
					>
						<Download class="size-3.5" />
						Layers
					</a>
					<form {...photoForm.enhance(upload(scene.id))} enctype="multipart/form-data">
						<input {...photoForm.fields.sceneId.as('hidden', scene.id)} />
						<label
							class={button({
								size: 'sm',
								variant: 'ghost',
								class:
									'cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-primary-300'
							})}
							title="Replace this scene's photo with an image, or upload an edited .ora file to replace the photo and the masks of its named layers. Other masks are kept, so check they still fit."
						>
							{#if busy === scene.id}
								<LoaderCircle class="size-3.5 animate-spin" />
							{:else}
								<Upload class="size-3.5" />
							{/if}
							Upload
							<input
								{...photoForm.fields.photo.as('file')}
								accept="image/png,image/jpeg,image/webp,image/openraster,.ora"
								class="sr-only"
								disabled={!!busy}
								onchange={(event) => event.currentTarget.form?.requestSubmit()}
							/>
						</label>
					</form>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Surfaces"
						aria-expanded="true"
						title="Surfaces"
						onclick={() => (collapsed = true)}
					>
						<PanelRightClose class="size-3.5" />
					</Button>
				</div>
				{#if photoForm.fields.allIssues()}
					<p class="px-1.5 pb-1 text-[11px] text-danger-300">
						The file could not be used; choose a PNG, JPEG, WebP or OpenRaster (.ora) file.
					</p>
				{/if}
				{#each scene.parts as part, index (part.id)}
					{@const Icon = partIcon(part.icon)}
					{@const mask = part.mask}
					{@const maskForm = saveMask.for(part.id)}
					<div
						class="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition hover:bg-white/8"
						role="group"
						aria-label={part.name}
						onpointerenter={() => (hovered = part.id)}
						onpointerleave={() => (hovered = undefined)}
					>
						{#if mask}
							<img src={mask} alt="" class="size-9 shrink-0 rounded-lg bg-night-950 object-cover" />
						{:else}
							<span
								class="size-9 shrink-0 rounded-lg chip"
								style:background-color={maskColor(index)}
							></span>
						{/if}
						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-1.5 text-sm font-medium">
								<Icon class="size-3.5 shrink-0 text-white/45" />
								<span class="truncate">{part.name}</span>
							</span>
							<span class="block text-[11px] text-white/45">
								{#if maskForm.fields.allIssues()}
									<span class="text-danger-300"
										>The mask could not be saved; choose a PNG, JPEG or WebP image.</span
									>
								{:else if mask}
									<Check class="inline size-3 text-primary-300" />
									Mask
								{:else}
									<span class="text-amber-300">No mask yet</span>
								{/if}
							</span>
						</span>

						<form {...maskForm.enhance(upload(part.id))} enctype="multipart/form-data">
							<input {...maskForm.fields.sceneId.as('hidden', scene.id)} />
							<input {...maskForm.fields.partId.as('hidden', part.id)} />
							<label
								class={button({
									size: 'icon-sm',
									variant: 'ghost',
									class:
										'cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-primary-300'
								})}
								title={mask ? 'Replace mask' : 'Upload mask'}
							>
								{#if busy === part.id}
									<LoaderCircle class="size-3.5 animate-spin" />
								{:else}
									<Upload class="size-3.5" />
								{/if}
								<span class="sr-only">{mask ? 'Replace mask' : 'Upload mask'}</span>
								<input
									{...maskForm.fields.mask.as('file')}
									accept="image/png,image/jpeg,image/webp"
									class="sr-only"
									disabled={!!busy}
									onchange={(event) => event.currentTarget.form?.requestSubmit()}
								/>
							</label>
						</form>
						{#if mask}
							<Button
								size="icon-sm"
								variant="ghost"
								disabled={!!busy}
								aria-label="Remove mask"
								title="Remove mask"
								onclick={() => removeMask(part.id)}
							>
								<Trash2 class="size-3.5" />
							</Button>
						{/if}
						<Button
							size="icon-sm"
							variant="ghost"
							aria-label="Edit surface"
							title="Edit surface"
							onclick={() => (editing = { kind: 'part', part })}
						>
							<Pencil class="size-3.5" />
						</Button>
					</div>
				{:else}
					<p class="p-2 text-sm text-white/55">Add a surface, then upload its mask.</p>
				{/each}
				<button
					type="button"
					class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
					onclick={() => (editing = { kind: 'part' })}
				>
					<Plus class="size-4" />
					New surface
				</button>
				<p class="mt-auto px-1.5 pt-2 text-[11px] text-white/40">
					A mask is an image the shape of the photo: white or opaque where the surface is, black or
					transparent elsewhere. It's stretched over the photo; where masks overlap, the later
					surface wins. To edit masks together, download the scene's layers, change them in GIMP or
					Krita and upload the .ora file again.
				</p>
			</div>
		{/if}
	</Card>
</div>

{#if editing?.kind === 'scene'}
	{@const form = saveScene.for(scene.id)}
	<EntryDialog
		title="Edit scene"
		{form}
		id={scene.id}
		note="Deleting a scene also deletes its surfaces, masks and palettes."
		ondelete={removeScene}
		onclose={() => (editing = undefined)}
	>
		<NameField field={form.fields.name} value={scene.name} />
		<GroupField field={form.fields.groupId} groups={data.groups} value={scene.groupId} />
		<SortField field={form.fields.sortOrder} value={scene.sortOrder} />
	</EntryDialog>
{:else if editing?.kind === 'part'}
	{@const edited = editing.part}
	{@const form = savePart.for(edited?.id ?? '')}
	<EntryDialog
		title={edited ? 'Edit surface' : 'New surface'}
		{form}
		id={edited?.id}
		ondelete={edited && (() => deletePart({ sceneId: scene.id, partId: edited.id }))}
		invalidMessage="Please fill in a name and a layer no other surface of this scene has."
		note="Deleting a surface also deletes its mask."
		onclose={() => (editing = undefined)}
	>
		<input {...form.fields.sceneId.as('hidden', scene.id)} />
		<NameField field={form.fields.name} value={edited?.name} />
		<NameField field={form.fields.layer} value={edited?.layer} label="Layer" autofocus={false} />
		<p class="-mt-2 text-[11px] text-white/40">
			Names the surface's mask in .ora files. Surfaces on the same layer share their colour across a
			project's scenes, e.g. "facade" on the front and the back of the house.
		</p>
		<NameField
			field={form.fields.hint}
			value={edited?.hint}
			label="Description"
			required={false}
			autofocus={false}
		/>
		<fieldset>
			<legend class="mb-1.5 text-xs font-medium text-white/60">Icon</legend>
			<div class="flex flex-wrap gap-1">
				{#each PART_ICONS as icon (icon)}
					{@const Icon = partIcons[icon]}
					<label
						class="grid size-9 cursor-pointer place-items-center rounded-xl well text-white/55 transition hover:text-white has-checked:bg-white/14 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-primary-300"
						title={icon}
					>
						<input
							{...form.fields.icon.as('radio', icon, (edited?.icon ?? 'paint') === icon)}
							class="sr-only"
						/>
						<Icon class="size-4" />
						<span class="sr-only">{icon}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<SortField field={form.fields.sortOrder} value={edited?.sortOrder ?? nextSort(scene.parts)} />
	</EntryDialog>
{/if}
