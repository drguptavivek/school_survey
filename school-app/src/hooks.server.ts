import { validateSession } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import type { AuthenticatedUser } from '$lib/server/guards';

/**
 * SvelteKit server hooks
 * This runs on every request to load session data
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Get session token from cookies
	const sessionToken = event.cookies.get('session');

	// Initialize user as null
	event.locals.user = null;

	// If token exists, validate it
	if (sessionToken) {
		const result = await validateSession(sessionToken);

		if (result) {
			const { user } = result;

			// Store user in locals for use in routes/components
			event.locals.user = {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				partnerId: user.partnerId,
				code: (user as any).code ?? null,
				isActive: user.isActive,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				lastLoginAt: user.lastLoginAt,
				createdBy: user.createdBy
			} as AuthenticatedUser;
		} else {
			// Session invalid or expired, remove cookie
			event.cookies.delete('session', { path: '/' });
		}
	}

	// Process request and get response
	const response = await resolve(event);

	return response;
};
