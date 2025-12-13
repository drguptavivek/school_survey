import { db } from '$lib/server/db';
import { districts } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireNationalAdmin({ locals } as any);

	const state = url.searchParams.get('state');
	
	if (!state) {
		return new Response(JSON.stringify({ error: 'State parameter is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const districtsList = await db
			.select({
				name: districts.name
			})
			.from(districts)
			.where(eq(districts.state, state))
			.orderBy(districts.name);

		return new Response(JSON.stringify({ districts: districtsList }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching districts:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch districts' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};