import { db } from '$lib/server/db';
import { partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { partnerWithIdSchema, type PartnerInput } from '$lib/validation/partner';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	const { id } = event.params;

	const record = await db
		.select({
			id: partners.id,
			name: partners.name,
			code: partners.code,
			contactEmail: partners.contactEmail,
			contactPhone: partners.contactPhone,
			isActive: partners.isActive
		})
		.from(partners)
		.where(eq(partners.id, id))
		.limit(1);

	if (record.length === 0) {
		throw error(404, 'Partner not found');
	}

	const existingCodes = await db.select({ id: partners.id, code: partners.code }).from(partners);

	const values: PartnerInput & { id?: string } = {
		...record[0],
		contactEmail: record[0].contactEmail ?? '',
		contactPhone: record[0].contactPhone ?? ''
	};

	return {
		values,
		existingCodes,
		errors: null
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
			code: formData.get('code'),
			contactEmail: formData.get('contactEmail'),
			contactPhone: formData.get('contactPhone'),
			isActive: formData.get('isActive') ?? false
		};

		const parsed = partnerWithIdSchema.safeParse(payload);

		if (!parsed.success) {
			return fail(400, {
				values: {
					id: String(payload.id ?? ''),
					name: String(payload.name ?? ''),
					code: String(payload.code ?? ''),
					contactEmail: (payload.contactEmail as string | null) ?? '',
					contactPhone: (payload.contactPhone as string | null) ?? '',
					isActive: payload.isActive === true || payload.isActive === 'on' || payload.isActive === 'true'
				},
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const { id, name, code, contactEmail, contactPhone, isActive } = parsed.data;

		const existing = await db
			.select({
				id: partners.id,
				name: partners.name,
				code: partners.code,
				contactEmail: partners.contactEmail,
				contactPhone: partners.contactPhone,
				isActive: partners.isActive
			})
			.from(partners)
			.where(eq(partners.id, id))
			.limit(1);

		if (existing.length === 0) {
			return fail(404, { errors: { id: ['Partner not found'] }, values: parsed.data });
		}

		const exists = await db
			.select({ id: partners.id })
			.from(partners)
			.where(and(eq(partners.code, code), sql`${partners.id} != ${id}`))
			.limit(1);

		if (exists.length > 0) {
			return fail(400, {
				values: parsed.data,
				errors: { code: ['Code must be unique'] }
			});
		}

		const updated = await db
			.update(partners)
			.set({
				name,
				code,
				contactEmail,
				contactPhone,
				isActive,
				updatedAt: new Date()
			})
			.where(eq(partners.id, id))
			.returning({ id: partners.id });

		if (updated.length === 0) {
			throw error(404, 'Partner not found');
		}

		await logAudit({
			event,
			userId: event.locals.user?.id,
			action: 'partner_updated',
			entityType: 'partner',
			entityId: id,
			oldData: existing[0],
			newData: { id, name, code, contactEmail, contactPhone, isActive }
		});

	throw redirect(303, '/partners');
}
};
