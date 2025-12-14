import { fail, redirect } from '@sveltejs/kit';
import { authenticateUser, createSession } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const SESSION_COOKIE_NAME = 'session';
const SESSION_COOKIE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const load: PageServerLoad = async (event) => {
	// If user is already logged in, redirect to dashboard
	if (event.locals.user) {
		throw redirect(302, '/dashboard');
	}

	return {};
};

export const actions: Actions = {
	default: async (event) => {
		try {
			const formData = await event.request.formData();
			const identifier = formData.get('email')?.toString().trim();
			const password = formData.get('password')?.toString();

			console.log('[LOGIN] Attempting login for identifier:', identifier);

			// Validate input
			if (!identifier || !password) {
				return fail(400, {
					error: 'Email/User Code and password are required'
				});
			}

			const looksLikeEmail = identifier.includes('@');
			const looksLikeCode = /^U\d+$/i.test(identifier);
			if (!looksLikeEmail && !looksLikeCode) {
				return fail(400, {
					error: 'Enter a valid email address or user code (e.g. U1008)'
				});
			}

			if (password.length < 6) {
				return fail(400, {
					error: 'Invalid credentials'
				});
			}

			// Authenticate user
			console.log('[LOGIN] Authenticating user...');
			const user = await authenticateUser(identifier, password);
			console.log('[LOGIN] Auth result:', user ? 'success' : 'failed');

			if (!user) {
				return fail(401, {
					error: 'Invalid email/user code or password'
				});
			}

			// Create session
			console.log('[LOGIN] Creating session...');
			const sessionToken = await createSession(
				user.id,
				event.getClientAddress(),
				event.request.headers.get('user-agent') || undefined
			);
			console.log('[LOGIN] Session created');

			// Set secure session cookie
			event.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
				httpOnly: true,
				secure: false, // Changed to false for development (localhost)
				sameSite: 'lax',
				path: '/',
				maxAge: SESSION_COOKIE_DURATION / 1000
			});

			console.log('[LOGIN] Cookie set, redirecting to dashboard');

			// Redirect to dashboard
			throw redirect(302, '/dashboard');
		} catch (error) {
			// Re-throw SvelteKit redirects
			if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 302) {
				throw error;
			}
			console.error('[LOGIN] Error:', error);
			return fail(500, {
				error: 'An error occurred during login. Please try again.'
			});
		}
	}
};
