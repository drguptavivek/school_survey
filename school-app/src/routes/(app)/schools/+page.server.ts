import { db } from '$lib/server/db';
import { schools, districts, partners } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/guards';
import { error } from '@sveltejs/kit';
import { eq, ilike, or, and, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const getSchools = async (
	search: string | undefined,
	district: string | undefined,
	state: string | undefined,
	partnerId: string | null
) => {
	const term = search?.trim();

	const rows = await db
		.select({
			id: schools.id,
			name: schools.name,
			code: schools.code,
			partnerId: schools.partnerId,
			districtName: districts.name,
			districtState: districts.state,
			partnerName: partners.name,
			isSelectedForSurvey: schools.isSelectedForSurvey,
			hasSurveyData: schools.hasSurveyData,
			isActive: schools.isActive
		})
		.from(schools)
		.leftJoin(districts, eq(schools.districtId, districts.id))
		.leftJoin(partners, eq(schools.partnerId, partners.id))
		.where(
			and(
				isNull(schools.deletedAt),
				term || district || state || partnerId
					? and(
							term
								? or(
										ilike(schools.name, `%${term}%`),
										ilike(schools.code, `%${term}%`),
										ilike(districts.name, `%${term}%`),
										ilike(districts.state, `%${term}%`),
										ilike(partners.name, `%${term}%`)
								  )
								: undefined,
							district ? eq(schools.districtId, district) : undefined,
							state ? eq(districts.state, state) : undefined,
							partnerId ? eq(schools.partnerId, partnerId) : undefined
					  )
					: undefined
			)
		)
		.orderBy(schools.name);

	return rows;
};

export const load: PageServerLoad = async (event) => {
	const currentUser = await requireAuth(event);

	// Partner-scoped roles must belong to a partner.
	if ((currentUser.role === 'partner_manager' || currentUser.role === 'team_member') && !currentUser.partnerId) {
		throw error(403, 'Forbidden - User is not assigned to a partner');
	}

	const search = event.url.searchParams.get('q') ?? undefined;
	const district = event.url.searchParams.get('district') ?? undefined;
	const state = event.url.searchParams.get('state') ?? undefined;

	const partnerScopeId =
		currentUser.role === 'partner_manager' || currentUser.role === 'team_member' ? currentUser.partnerId : null;
	const schoolsList = await getSchools(search, district, state, partnerScopeId);

	// Get unique states for filter dropdown
	const statesList = await db
		.selectDistinct({
			state: districts.state
		})
		.from(districts)
		.where(partnerScopeId ? eq(districts.partnerId, partnerScopeId) : undefined)
		.orderBy(districts.state);

	// Get districts for filter dropdown
	const districtsList = await db
		.select({
			id: districts.id,
			name: districts.name,
			state: districts.state
		})
		.from(districts)
		.where(partnerScopeId ? eq(districts.partnerId, partnerScopeId) : undefined)
		.orderBy(districts.name);

	return {
		schools: schoolsList,
		states: statesList.map((s) => s.state).filter((s) => s !== null) as string[],
		districts: districtsList,
		search,
		district,
		state
	};
};
