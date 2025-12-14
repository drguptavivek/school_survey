import { db } from '$lib/server/db';
import { users, partners } from '$lib/server/db/schema';
import { requireCentralAdmin } from '$lib/server/guards';
import { eq, ilike, or, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const getUsers = async (search?: string, role?: string, active?: string) => {
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
				term || role || active
					? and(
							term
								? or(
										ilike(users.name, `%${term}%`),
										ilike(users.email, `%${term}%`),
										ilike(users.code, `%${term}%`),
										ilike(users.phoneNumber, `%${term}%`)
								  )
								: undefined,
							role ? eq(users.role, role) : undefined,
							active ? eq(users.isActive, active === 'Y') : undefined
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
	await requireCentralAdmin(event);

	const search = event.url.searchParams.get('q') ?? undefined;
	const role = event.url.searchParams.get('role') ?? undefined;
	const active = event.url.searchParams.get('active') ?? undefined;

	const usersList = await getUsers(search, role, active);

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
