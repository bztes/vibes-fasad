import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// The library opens on its colours.
export const load: PageLoad = ({ url }) => redirect(307, `${url.pathname}/colors`);
