import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// Redirect unauthenticated users to login
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	return {
		user: event.locals.user
	};
};
