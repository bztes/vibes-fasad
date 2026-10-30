/** `LogoMark`'s three dots as an SVG data URL for the browser tab, in `colors` repeated as needed. */
export const logoIcon = (colors: string[]) => {
	const dot = (index: number, cx: number, cy: number) =>
		`<circle cx="${cx}" cy="${cy}" r="12" fill="${colors[index % colors.length]}"${index ? ' style="mix-blend-mode:screen"' : ''}/>`;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">${dot(0, 12, 12)}${dot(1, 24, 12)}${dot(2, 18, 24)}</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
