import { db } from '$lib/server/db';
import { schools, districts, partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { eq, ilike, or, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const getSchools = async (search?: string, district?: string, state?: string) => {
	const term = search?.trim();

	const rows = await db
		.select({
			id: schools.id,
			name: schools.name,
			code: schools.code,
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
			term || district || state
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
						state ? eq(districts.state, state) : undefined
				  )
				: undefined
		)
		.orderBy(schools.name);

	return rows;
};

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);

	const search = event.url.searchParams.get('q') ?? undefined;
	const district = event.url.searchParams.get('district') ?? undefined;
	const state = event.url.searchParams.get('state') ?? undefined;

	const schoolsList = await getSchools(search, district, state);

	// Get unique states for filter dropdown
	const statesList = await db
		.selectDistinct({
			state: districts.state
		})
		.from(districts)
		.orderBy(districts.state);

	// Get districts for filter dropdown
	const districtsList = await db
		.select({
			id: districts.id,
			name: districts.name,
			state: districts.state
		})
		.from(districts)
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
