import { redirect } from '@sveltejs/kit';
import { chooseProject, noticeAccount } from '#lib/fasad/project.svelte.ts';
import { isKey, KEY_PARAM } from '#lib/fasad/keys.ts';
import { keepProject } from '#lib/fasad/projects.remote.ts';
import type { LayoutLoad } from './$types';

// A project's link carries a key, which the viewer's account keeps (made for it on first use), so
// it needn't stay in the address bar.
export const load: LayoutLoad = async ({ params, url }) => {
	// The navigation leads back to it from the library, which saves into it.
	chooseProject(params.id);
	const key = url.searchParams.get(KEY_PARAM);
	if (key === null) return;
	if (isKey(key)) {
		try {
			noticeAccount(await keepProject({ id: params.id, key }));
		} catch {
			// A revoked key: the page says the project wasn't found.
		}
	}
	const search = new URLSearchParams(url.searchParams);
	search.delete(KEY_PARAM);
	redirect(307, `${url.pathname}${search.size ? `?${search}` : ''}`);
};
