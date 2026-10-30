<script lang="ts">
	import { getDevices, removeDevice } from '#lib/account.remote.ts';
	import ConfirmDelete from '#lib/components/ui/ConfirmDelete.svelte';
	import { timeAgo } from '#lib/fasad/format.ts';
	import { TriangleAlert } from '@lucide/svelte';

	/** The devices signed in to the viewer's account; any but this one can be signed out. */
	let devices = $derived(await getDevices());
</script>

<ul class="mt-2 divide-y divide-white/6 rounded-2xl well">
	{#each devices as device (device.id)}
		<li class="flex items-center gap-2 py-2 pr-1.5 pl-3">
			<div class="min-w-0 flex-1">
				<p class="flex items-center gap-2 text-sm">
					<span class="truncate">{device.name}</span>
					{#if device.isThis}
						<span class="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/60">
							This device
						</span>
					{/if}
				</p>
				<p class="text-[11px] text-white/45">
					Last used {timeAgo(device.lastSeenAt)}
				</p>
			</div>
			{#if !device.isThis}
				<ConfirmDelete label="Remove {device.name}" ondelete={() => removeDevice(device.id)} />
			{/if}
		</li>
	{/each}
</ul>

<!-- There's no password to fall back on: the devices, and a recovery e-mail if any, are the only way in. -->
{#if devices.length === 1}
	<p class="mt-2 flex gap-2 rounded-xl bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
		<TriangleAlert class="mt-px size-3.5 shrink-0" />
		This is your only device. If this browser's data is cleared, your projects are gone with it, so add
		another device to be safe.
	</p>
{/if}
