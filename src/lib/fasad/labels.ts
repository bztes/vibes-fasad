import {
	AppWindow,
	BrickWall,
	DoorClosed,
	Fence,
	Frame,
	Paintbrush,
	Ruler,
	Warehouse
} from '@lucide/svelte';
import type { PartIcon } from './types.ts';

export const partIcons = {
	facade: Fence,
	frame: Frame,
	window: AppWindow,
	door: DoorClosed,
	roof: Warehouse,
	wall: BrickWall,
	trim: Ruler,
	paint: Paintbrush
} satisfies Record<PartIcon, unknown>;

export const partIcon = (icon: string) => partIcons[icon as PartIcon] ?? Paintbrush;
