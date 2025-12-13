import { db } from '$lib/server/db';
import { districts, partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const getPartners = async (search?: string) => {
	const term = search?.trim();

	const rows = await db
		.select({
			id: partners.id,
			name: partners.name,
			code: partners.code,
			contactEmail: partners.contactEmail,
			contactPhone: partners.contactPhone,
			isActive: partners.isActive,
			districtCount: sql<number>`count(${districts.id})`
		})
		.from(partners)
		.leftJoin(districts, eq(partners.id, districts.partnerId))
		.where(
			term
				? or(
						ilike(partners.name, `%${term}%`),
						ilike(partners.code, `%${term}%`),
						ilike(sql`coalesce(${partners.contactEmail}, '')`, `%${term}%`)
				  )
				: undefined
		)
		.groupBy(partners.id)
		.orderBy(partners.name);

	return rows;
};

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	const search = event.url.searchParams.get('q') ?? undefined;

	const partnersList = await getPartners(search);

	return {
		partners: partnersList,
		search
	};
};
