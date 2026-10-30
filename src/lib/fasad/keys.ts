/** Project keys are 144 random bits, base64url-encoded into 24 characters. */
const KEY = /^[A-Za-z0-9_-]{24}$/;

export function newKey() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return btoa(String.fromCharCode(...bytes))
		.replaceAll('+', '-')
		.replaceAll('/', '_');
}

export function isKey(value: unknown): value is string {
	return typeof value === 'string' && KEY.test(value);
}

/** Search parameter of project links, which carry the key: `/<project id>?key=<key>`. */
export const KEY_PARAM = 'key';
