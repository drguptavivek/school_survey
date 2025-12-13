import { db } from '$lib/server/db';
import { districts, partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, ilike, or, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';

const partnerSchema = z.object({
	id: z.string().uuid().optional(),
	name: z.string().min(2, 'Name is required'),
	code: z
		.string()
		.min(2, 'Code is required')
		.max(50, 'Code is too long')
		.transform((val) => val.trim().toUpperCase()),
	contactEmail: z
		.string()
		.email('Invalid email')
		.optional()
		.or(z.literal(''))
		.transform((v) => (v ? v : null)),
	contactPhone: z
		.string()
		.max(50, 'Phone is too long')
		.optional()
		.or(z.literal(''))
		.transform((v) => (v ? v : null)),
	isActive: z.boolean()
});

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

const parseForm = async (request: Request) => {
	const formData = await request.formData();
	const raw = {
		id: formData.get('id')?.toString(),
		name: formData.get('name')?.toString(),
		code: formData.get('code')?.toString(),
		contactEmail: formData.get('contactEmail')?.toString(),
		contactPhone: formData.get('contactPhone')?.toString(),
		isActive: formData.get('isActive') === 'on'
	};

	const parsed = partnerSchema.safeParse(raw);
	if (!parsed.success) {
		return { success: false as const, errors: parsed.error.flatten().fieldErrors };
	}

	return { success: true as const, data: parsed.data };
};

export const actions: Actions = {
	create: async (event) => {
		await requireNationalAdmin(event);

		const parsed = await parseForm(event.request);
		if (!parsed.success) {
			return fail(400, { errors: parsed.errors });
		}

		const { name, code, contactEmail, contactPhone, isActive } = parsed.data;

		try {
			await db.insert(partners).values({
				name,
				code,
				contactEmail,
				contactPhone,
				isActive,
				createdBy: event.locals.user?.id ?? null
			});
		} catch (err: unknown) {
			console.error('[PARTNERS][CREATE] Error:', err);
			return fail(400, {
				errors: { code: ['Code must be unique'] }
			});
		}

		throw redirect(303, '/partners');
	},

	update: async (event) => {
		await requireNationalAdmin(event);

		const parsed = await parseForm(event.request);
		if (!parsed.success) {
			return fail(400, { errors: parsed.errors });
		}

		if (!parsed.data.id) {
			throw error(400, 'Missing partner id');
		}

		const { id, name, code, contactEmail, contactPhone, isActive } = parsed.data;

		try {
			await db
				.update(partners)
				.set({
					name,
					code,
					contactEmail,
					contactPhone,
					isActive,
					updatedAt: new Date()
				})
				.where(eq(partners.id, id));
		} catch (err: unknown) {
			console.error('[PARTNERS][UPDATE] Error:', err);
			return fail(400, {
				errors: { code: ['Code must be unique'] }
			});
		}

		throw redirect(303, '/partners');
	}
};
