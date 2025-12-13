import { db } from '$lib/server/db';
import { schools } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireNationalAdmin({ locals } as any);

	const district = url.searchParams.get('district');

	if (!district) {
		return new Response(JSON.stringify({ error: 'District parameter is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const schoolsList = await db
			.select({
				name: schools.name,
				code: schools.code
			})
			.from(schools)
			.where(eq(schools.districtId, district))
			.orderBy(schools.name);

		return new Response(JSON.stringify({ schools: schoolsList }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching schools:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch schools' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
