import { describe, expect, it, vi, beforeEach } from 'vitest';
import { actions } from '../../routes/(auth)/login/+page.server';
import { authenticateUser, createSession } from '$lib/server/auth';

vi.mock('$lib/server/auth', () => ({
	authenticateUser: vi.fn(),
	createSession: vi.fn()
}));

const mockedAuthenticateUser = vi.mocked(authenticateUser);
const mockedCreateSession = vi.mocked(createSession);

const makeEvent = (email = 'admin@example.com', password = 'password123') => {
	const formData = new FormData();
	formData.append('email', email);
	formData.append('password', password);

	const request = new Request('http://localhost/login', {
		method: 'POST',
		body: formData
	});

	const cookies = {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn()
	};

	return {
		request,
		cookies,
		locals: {},
		getClientAddress: () => '127.0.0.1'
	} as any;
};

describe('login action', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('redirects to dashboard and sets session cookie on success', async () => {
		mockedAuthenticateUser.mockResolvedValue({
			id: 'user-1',
			email: 'admin@example.com',
			passwordHash: 'hash',
			name: 'Admin User',
			role: 'national_admin',
			partnerId: null,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			lastLoginAt: null,
			createdBy: null
		} as any);

		mockedCreateSession.mockResolvedValue('session-token');

		const event = makeEvent();

		await expect(actions.default(event)).rejects.toMatchObject({ status: 302 });

		expect(mockedAuthenticateUser).toHaveBeenCalledWith('admin@example.com', 'password123');
		expect(mockedCreateSession).toHaveBeenCalledWith('user-1', '127.0.0.1', undefined);
		expect(event.cookies.set).toHaveBeenCalledWith(
			'session',
			'session-token',
			expect.objectContaining({
				httpOnly: true,
				path: '/'
			})
		);
	});

	it('returns failure when credentials are invalid', async () => {
		mockedAuthenticateUser.mockResolvedValue(null);

		const event = makeEvent('bad@example.com', 'wrongpass');

		const result = await actions.default(event);

		expect(result?.status).toBe(401);
		expect(mockedCreateSession).not.toHaveBeenCalled();
		expect(event.cookies.set).not.toHaveBeenCalled();
	});
});
