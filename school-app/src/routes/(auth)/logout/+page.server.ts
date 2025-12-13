import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	try {
		const sessionToken = event.cookies.get('session');

		// Delete session from database if it exists
		if (sessionToken) {
			await deleteSession(sessionToken);
			// Clear session cookie before redirect
			event.cookies.delete('session', { path: '/' });
		}
	} catch (error) {
		console.error('[LOGOUT] Error during logout:', error);
	}

	// Redirect to login
	throw redirect(302, '/login');
};
