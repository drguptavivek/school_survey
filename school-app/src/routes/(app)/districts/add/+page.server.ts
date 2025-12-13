import { db } from '$lib/server/db';
import { districts, partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { districtCreateSchema, type DistrictCreateInput } from '$lib/validation/district';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';

const defaults: DistrictCreateInput = {
	name: '',
	state: '',
	partnerId: ''
};

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);

	// Get active partners for dropdown
	const partnersList = await db
		.select({
			id: partners.id,
			name: partners.name,
			code: partners.code
		})
		.from(partners)
		.where(eq(partners.isActive, true))
		.orderBy(partners.name);

	return { 
		values: defaults, 
		errors: null,
		partners: partnersList
	};
};

export const actions: Actions = {
	default: async (event) => {
		await requireNationalAdmin(event);

		const formData = await event.request.formData();
		const payload = {
			name: formData.get('name'),
			state: formData.get('state'),
			partnerId: formData.get('partnerId')
		};

		const parsed = districtCreateSchema.safeParse(payload);

		if (!parsed.success) {
			// Re-fetch partners for dropdown
			const partnersList = await db
				.select({
					id: partners.id,
					name: partners.name,
					code: partners.code
				})
				.from(partners)
				.where(eq(partners.isActive, true))
				.orderBy(partners.name);

			return fail(400, {
				values: {
					name: String(payload.name ?? ''),
					state: String(payload.state ?? ''),
					partnerId: String(payload.partnerId ?? '')
				},
				errors: parsed.error.flatten().fieldErrors,
				partners: partnersList
			});
		}

		const { name, state, partnerId } = parsed.data;

		const inserted = await db.insert(districts).values({
			name,
			state,
			partnerId,
			createdBy: event.locals.user?.id ?? null
		}).returning({ id: districts.id, code: districts.code });

		if (inserted[0]?.id) {
			// Get partner name for audit
			const partner = await db
				.select({ name: partners.name })
				.from(partners)
				.where(eq(partners.id, partnerId))
				.limit(1);

			await logAudit({
				event,
				userId: event.locals.user?.id,
				action: 'district_created',
				entityType: 'district',
				entityId: inserted[0].id,
				oldData: null,
				newData: { 
					id: inserted[0].id, 
					code: inserted[0].code, 
					name, 
					state, 
					partnerId,
					partnerName: partner[0]?.name
				}
			});
		}

		throw redirect(303, '/districts');
	}
};