import { db } from '$lib/server/db';
import { districts, partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { districtUpdateSchema, type DistrictUpdateInput } from '$lib/validation/district';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';
import { INDIAN_STATES_UTS } from '$lib/data/indian-states';

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	const { id } = event.params;

	const record = await db
		.select({
			id: districts.id,
			name: districts.name,
			code: districts.code,
			state: districts.state,
			partnerId: districts.partnerId
		})
		.from(districts)
		.where(eq(districts.id, id))
		.limit(1);

	if (record.length === 0) {
		throw error(404, 'District not found');
	}

	const values: DistrictUpdateInput & { id?: string } = {
		id: record[0].id,
		name: record[0].name,
		state: record[0].state ?? INDIAN_STATES_UTS[0],
		partnerId: record[0].partnerId
	};

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
		values,
		errors: null,
		code: record[0].code,
		partners: partnersList,
		states: INDIAN_STATES_UTS
	};
};

export const actions: Actions = {
	default: async (event) => {
		await requireNationalAdmin(event);
		const { id: paramId } = event.params;

		const formData = await event.request.formData();
		const payload = {
			id: formData.get('id') ?? paramId,
			name: formData.get('name'),
			state: formData.get('state'),
			partnerId: formData.get('partnerId')
		};

		const parsed = districtUpdateSchema.safeParse(payload);

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
					id: String(payload.id ?? ''),
					name: String(payload.name ?? ''),
					state: String(payload.state ?? ''),
					partnerId: String(payload.partnerId ?? '')
				},
				errors: parsed.error.flatten().fieldErrors,
				partners: partnersList
			});
		}

		const { id, name, state, partnerId } = parsed.data;

		const existing = await db
			.select({
				id: districts.id,
				name: districts.name,
				code: districts.code,
				state: districts.state,
				partnerId: districts.partnerId
			})
			.from(districts)
			.where(eq(districts.id, id))
			.limit(1);

		if (existing.length === 0) {
			return fail(404, { errors: { id: ['District not found'] }, values: parsed.data });
		}

		const updated = await db
			.update(districts)
			.set({
				name,
				state,
				partnerId,
				updatedAt: new Date()
			})
			.where(eq(districts.id, id))
			.returning({ id: districts.id });

		if (updated.length === 0) {
			throw error(404, 'District not found');
		}

		// Get partner names for audit
		const oldPartner = await db
			.select({ name: partners.name })
			.from(partners)
			.where(eq(partners.id, existing[0].partnerId))
			.limit(1);

		const newPartner = await db
			.select({ name: partners.name })
			.from(partners)
			.where(eq(partners.id, partnerId))
			.limit(1);

		await logAudit({
			event,
			userId: event.locals.user?.id,
			action: 'district_updated',
			entityType: 'district',
			entityId: id,
			oldData: {
				...existing[0],
				partnerName: oldPartner[0]?.name
			},
			newData: {
				id,
				name,
				state,
				partnerId,
				code: existing[0].code,
				partnerName: newPartner[0]?.name
			}
		});

	throw redirect(303, '/districts');
}
};