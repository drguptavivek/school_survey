import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// Redirect authenticated users away from auth pages
	if (event.locals.user) {
		throw redirect(302, '/dashboard');
	}

	return {};
};
