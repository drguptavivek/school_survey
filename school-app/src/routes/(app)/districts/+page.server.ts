import { db } from '$lib/server/db';
import { districts, partners, schools } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { eq, ilike, or, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const getDistricts = async (search?: string) => {
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
			term
				? or(
						ilike(districts.name, `%${term}%`),
						ilike(districts.code, `%${term}%`),
						ilike(districts.state, `%${term}%`),
						ilike(sql`coalesce(${partners.name}, '')`, `%${term}%`)
				  )
				: undefined
		)
		.groupBy(districts.id, partners.name)
		.orderBy(districts.name);

	return rows;
};

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	const search = event.url.searchParams.get('q') ?? undefined;

	const districtsList = await getDistricts(search);

	return {
		districts: districtsList,
		search
	};
};