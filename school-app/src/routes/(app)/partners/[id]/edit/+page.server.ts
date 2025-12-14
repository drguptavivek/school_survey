import { db } from '$lib/server/db';
import { partners } from '$lib/server/db/schema';
import { requireNationalAdmin, requireAuth } from '$lib/server/guards';
import { partnerUpdateSchema, type PartnerUpdateInput } from '$lib/validation/partner';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	const currentUser = await requireAuth(event);
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

	const values: PartnerUpdateInput & { id?: string } = {
		id: record[0].id,
		name: record[0].name,
		contactEmail: record[0].contactEmail ?? '',
		contactPhone: record[0].contactPhone ?? '',
		comments: (record[0] as { comments?: string | null }).comments ?? '',
		isActive: record[0].isActive
	};

	return {
		values,
		errors: null,
		code: record[0].code,
		currentUserRole: currentUser.role,
		currentUserPartnerId: currentUser.partnerId
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
			contactEmail: formData.get('contactEmail'),
			contactPhone: formData.get('contactPhone'),
			isActive: formData.get('isActive') ?? false
		};

		const parsed = partnerUpdateSchema.safeParse(payload);

		if (!parsed.success) {
			return fail(400, {
				values: {
					id: String(payload.id ?? ''),
					name: String(payload.name ?? ''),
					contactEmail: (payload.contactEmail as string | null) ?? '',
					contactPhone: (payload.contactPhone as string | null) ?? '',
					isActive: payload.isActive === true || payload.isActive === 'on' || payload.isActive === 'true'
				},
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const { id, name, contactEmail, contactPhone, isActive } = parsed.data;
		const { comments } = parsed.data;

		const existing = await db
			.select({
				id: partners.id,
				name: partners.name,
				code: partners.code,
				contactEmail: partners.contactEmail,
				contactPhone: partners.contactPhone,
				isActive: partners.isActive,
				comments: partners.comments
			})
			.from(partners)
			.where(eq(partners.id, id))
			.limit(1);

		if (existing.length === 0) {
			return fail(404, { errors: { id: ['Partner not found'] }, values: parsed.data });
		}

		const updated = await db
			.update(partners)
			.set({
				name,
				contactEmail,
				contactPhone,
				isActive,
				comments,
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
			newData: {
				id,
				name,
				code: existing[0].code,
				contactEmail,
				contactPhone,
				isActive
			}
		});

	throw redirect(303, '/partners');
}
};
