<script lang="ts">
	/** Soft light from the current colours, so the glass picks up the house's mood. */
	let { colors }: { colors: string[] } = $props();

	/** The first colour gets the biggest glow; scenes with fewer parts repeat theirs. */
	const glow = (index: number) => colors[index % colors.length];

	const grain =
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";
</script>

<div
	class="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-950"
	aria-hidden="true"
>
	<div
		class="absolute -top-[20%] -right-[10%] size-[70vmax] rounded-full opacity-45 blur-[120px] transition-colors duration-1000"
		style:background-color={glow(0)}
	></div>
	<div
		class="absolute -bottom-[30%] -left-[15%] size-[60vmax] rounded-full opacity-35 blur-[120px] transition-colors duration-1000"
		style:background-color={glow(1)}
	></div>
	<div
		class="absolute top-[30%] left-[35%] size-[35vmax] rounded-full opacity-20 blur-[100px] transition-colors duration-1000"
		style:background-color={glow(2)}
	></div>
	<div
		class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgb(9_11_10/0.55)_75%)]"
	></div>
	<div
		class="absolute inset-0 opacity-[0.07] mix-blend-overlay"
		style:background-image={grain}
	></div>
</div>
