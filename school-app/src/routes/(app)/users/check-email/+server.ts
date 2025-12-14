import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { and, ilike, ne } from 'drizzle-orm';
import { requireAuth } from '$lib/server/guards';

export const GET: RequestHandler = async (event) => {
	await requireAuth(event);

	const email = (event.url.searchParams.get('email') ?? '').trim();
	const excludeId = (event.url.searchParams.get('excludeId') ?? '').trim();

	if (!email) return json({ exists: false });

	// Basic sanity check; server-side schema validation still enforces full rules on submit.
	if (!email.includes('@')) return json({ exists: false });

	const rows = await db
		.select({ id: users.id })
		.from(users)
		.where(excludeId ? and(ilike(users.email, email), ne(users.id, excludeId)) : ilike(users.email, email))
		.limit(1);

	return json({ exists: rows.length > 0 });
};

