import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => {
	const state = {
		userPartnerId: null as string | null,
		schoolPartnerId: null as string | null
	};

	const chain = {
		select: vi.fn(() => chain),
		from: vi.fn(() => chain),
		where: vi.fn(() => chain),
		limit: vi.fn(async () => {
			// This mock is used by both user and school checks; the schema determines which is read.
			// We return both keys to keep the mock simple.
			return [
				{
					partnerId: state.userPartnerId ?? state.schoolPartnerId
				}
			];
		})
	};

	return {
		db: chain,
		__mockState: state
	};
});

// Minimal mock for schema imports; values are not used by our db mock.
vi.mock('$lib/server/db/schema', () => ({
	users: { id: 'users.id', partnerId: 'users.partnerId' },
	schools: { id: 'schools.id', partnerId: 'schools.partnerId' }
}));

vi.mock('drizzle-orm', () => ({
	eq: (...args: any[]) => ({ op: 'eq', args })
}));

import { requireSchoolEditAccess, requireUserAccess, UserRole } from './guards';
import { __mockState } from '$lib/server/db';

function makeEvent(user: any) {
	return { locals: { user } } as any;
}

describe('guards', () => {
	beforeEach(() => {
		__mockState.userPartnerId = null;
		__mockState.schoolPartnerId = null;
	});

	describe('requireUserAccess', () => {
		it('allows self access for team_member', async () => {
			const user = { id: 'u1', role: UserRole.TEAM_MEMBER, partnerId: 'p1' };
			await expect(requireUserAccess(makeEvent(user), 'u1')).resolves.toEqual(user);
		});

		it('denies non-self access for team_member', async () => {
			const user = { id: 'u1', role: UserRole.TEAM_MEMBER, partnerId: 'p1' };
			await expect(requireUserAccess(makeEvent(user), 'u2')).rejects.toMatchObject({ status: 403 });
		});

		it('allows any access for national_admin', async () => {
			const user = { id: 'u1', role: UserRole.NATIONAL_ADMIN, partnerId: null };
			await expect(requireUserAccess(makeEvent(user), 'u2')).resolves.toEqual(user);
		});

		it('allows any access for data_manager (current policy)', async () => {
			const user = { id: 'u1', role: UserRole.DATA_MANAGER, partnerId: null };
			await expect(requireUserAccess(makeEvent(user), 'u2')).resolves.toEqual(user);
		});

		it('allows partner_manager access only within same partner', async () => {
			const user = { id: 'u1', role: UserRole.PARTNER_MANAGER, partnerId: 'p1' };

			__mockState.userPartnerId = 'p1';
			await expect(requireUserAccess(makeEvent(user), 'u2')).resolves.toEqual(user);

			__mockState.userPartnerId = 'p2';
			await expect(requireUserAccess(makeEvent(user), 'u3')).rejects.toMatchObject({ status: 403 });
		});
	});

	describe('requireSchoolEditAccess', () => {
		it('allows any edit for national_admin', async () => {
			const user = { id: 'u1', role: UserRole.NATIONAL_ADMIN, partnerId: null };
			await expect(requireSchoolEditAccess(makeEvent(user), 's1')).resolves.toEqual(user);
		});

		it('allows any edit for data_manager (current policy)', async () => {
			const user = { id: 'u1', role: UserRole.DATA_MANAGER, partnerId: null };
			await expect(requireSchoolEditAccess(makeEvent(user), 's1')).resolves.toEqual(user);
		});

		it('allows partner_manager edit only within same partner', async () => {
			const user = { id: 'u1', role: UserRole.PARTNER_MANAGER, partnerId: 'p1' };

			__mockState.schoolPartnerId = 'p1';
			await expect(requireSchoolEditAccess(makeEvent(user), 's1')).resolves.toEqual(user);

			__mockState.schoolPartnerId = 'p2';
			await expect(requireSchoolEditAccess(makeEvent(user), 's2')).rejects.toMatchObject({ status: 403 });
		});

		it('denies team_member edit', async () => {
			const user = { id: 'u1', role: UserRole.TEAM_MEMBER, partnerId: 'p1' };
			await expect(requireSchoolEditAccess(makeEvent(user), 's1')).rejects.toMatchObject({ status: 403 });
		});
	});
});
