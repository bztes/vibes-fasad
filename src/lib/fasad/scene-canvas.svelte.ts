import { loadLayers } from '#lib/fasad/preview.ts';
import { recolor, type Layers } from '#lib/fasad/recolor.ts';
import { partHexes } from '#lib/fasad/scene.ts';
import type { PartColors, Scene } from '#lib/fasad/types.ts';
import type { Attachment } from 'svelte/attachments';

/**
 * A canvas showing a scene in its colours: attach `setup` to it. Its layers are rebuilt when the
 * scene, its photo or one of its masks changes, keeping the previous render until then; it's
 * repainted only when the parts' colours change.
 */
export class SceneCanvas {
	layers = $state.raw<Layers>();
	failed = $state(false);
	#canvas = $state<HTMLCanvasElement>();
	#hexes: string;

	constructor(
		input: () => { scene: Scene; colors: PartColors },
		/** `maxWidth` scales the layers down; `throttle` repaints at most once per frame, e.g. while dragging a colour picker. */
		{ maxWidth = Infinity, throttle = false } = {}
	) {
		this.setup = (element) => {
			let current = true;
			this.failed = false;
			loadLayers(input().scene, maxWidth)
				.then((loaded) => {
					if (!current) return;
					element.width = loaded.source.width;
					element.height = loaded.source.height;
					this.#canvas = element;
					this.layers = loaded;
				})
				.catch(() => current && (this.failed = true));
			return () => (current = false);
		};

		// As text, so new objects with the same colours don't repaint.
		this.#hexes = $derived(JSON.stringify(partHexes(input().scene, input().colors)));

		$effect(() => {
			const canvas = this.#canvas;
			const layers = this.layers;
			if (!canvas || !layers) return;
			const hexes: (string | null)[] = JSON.parse(this.#hexes);
			const paint = () => canvas.getContext('2d')?.putImageData(recolor(layers, hexes), 0, 0);
			if (!throttle) return void paint();
			const frame = requestAnimationFrame(paint);
			return () => cancelAnimationFrame(frame);
		});
	}

	readonly setup: Attachment<HTMLCanvasElement>;
}
