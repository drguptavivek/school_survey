import { db } from '$lib/server/db';
import { districts, partners, schools } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { eq, ilike, or, sql, and, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const getDistricts = async (search?: string, state?: string) => {
	const term = search?.trim();

	const rows = await db
		.select({
			id: districts.id,
			name: districts.name,
			code: districts.code,
			state: districts.state,
			partnerId: districts.partnerId,
			partnerName: partners.name,
			schoolCount: sql<number>`count(${schools.id})`,
			createdAt: districts.createdAt
		})
		.from(districts)
		.leftJoin(partners, eq(districts.partnerId, partners.id))
		.leftJoin(schools, eq(districts.id, schools.districtId))
		.where(
			and(
				isNull(districts.deletedAt),
				term || state
					? and(
							term
								? or(
										ilike(districts.name, `%${term}%`),
										ilike(districts.code, `%${term}%`),
										ilike(districts.state, `%${term}%`),
										ilike(sql`coalesce(${partners.name}, '')`, `%${term}%`)
								  )
								: undefined,
							state
								? eq(districts.state, state)
								: undefined
					  )
					: undefined
			)
		)
		.groupBy(districts.id, partners.name)
		.orderBy(districts.name);

	return rows;
};

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	const search = event.url.searchParams.get('q') ?? undefined;
	const state = event.url.searchParams.get('state') ?? undefined;

	const districtsList = await getDistricts(search, state);

	return {
		districts: districtsList,
		search,
		state
	};
};