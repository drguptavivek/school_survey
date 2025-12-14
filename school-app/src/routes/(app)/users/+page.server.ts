import { db } from '$lib/server/db';
import { users, partners } from '$lib/server/db/schema';
import { requireAuth, UserRole } from '$lib/server/guards';
import { error } from '@sveltejs/kit';
import { eq, ilike, or, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const getUsers = async (
	search: string | undefined,
	role: string | undefined,
	active: string | undefined,
	partnerId: string | null
) => {
	const term = search?.trim();

	try {
		const rows = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				code: users.code,
				phoneNumber: users.phoneNumber,
				role: users.role,
				isActive: users.isActive,
				partnerName: partners.name,
				createdAt: users.createdAt,
				lastLoginAt: users.lastLoginAt
			})
			.from(users)
			.leftJoin(partners, eq(users.partnerId, partners.id))
			.where(
				term || role || active || partnerId
					? and(
							term
								? or(
										ilike(users.name, `%${term}%`),
										ilike(users.email, `%${term}%`),
										ilike(users.code, `%${term}%`),
										ilike(users.phoneNumber, `%${term}%`)
							  )
								: undefined,
							role ? eq(users.role, role as UserRole) : undefined,
							active ? eq(users.isActive, active === 'Y') : undefined,
							partnerId ? eq(users.partnerId, partnerId) : undefined
					  )
					: undefined
			)
			.orderBy(users.name);

		return rows;
	} catch (error) {
		console.error('[USERS LIST] Database query failed:', error);
		// Return empty array as fallback
		return [];
	}
};

export const load: PageServerLoad = async (event) => {
	const currentUser = await requireAuth(event);

	// Partner-scoped roles must belong to a partner.
	if ((currentUser.role === 'partner_manager' || currentUser.role === 'team_member') && !currentUser.partnerId) {
		throw error(403, 'Forbidden - User is not assigned to a partner');
	}

	const search = event.url.searchParams.get('q') ?? undefined;
	const role = event.url.searchParams.get('role') ?? undefined;
	const active = event.url.searchParams.get('active') ?? undefined;

	// Partner-scoped roles can only see users belonging to their partner.
	const partnerScopeId =
		currentUser.role === 'partner_manager' || currentUser.role === 'team_member' ? currentUser.partnerId : null;
	const usersList = await getUsers(search, role, active, partnerScopeId);

	// Get unique roles for filter dropdown
	const rolesList = [
		{ value: 'national_admin', label: 'National Admin' },
		{ value: 'data_manager', label: 'Data Manager' },
		{ value: 'partner_manager', label: 'Partner Manager' },
		{ value: 'team_member', label: 'Team Member' }
	];

	return {
		users: usersList,
		roles: rolesList,
		search,
		role,
		active
	};
};
