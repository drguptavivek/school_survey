import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const SESSION_COOKIE_NAME = 'session';

export const GET: RequestHandler = async (event) => {
	try {
		const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

		if (sessionToken) {
			await deleteSession(sessionToken);
		}

		// Clear cookie before redirecting
		event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	} catch (error) {
		console.error('[LOGOUT] Error during logout:', error);
	}

	throw redirect(302, '/login');
};
