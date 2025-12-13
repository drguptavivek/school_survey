import { db } from '$lib/server/db';
import { partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { partnerCreateSchema, type PartnerCreateInput } from '$lib/validation/partner';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';

const defaults: PartnerCreateInput = {
	name: '',
	contactEmail: null,
	contactPhone: null,
	comments: null,
	isActive: true
};

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	return { values: defaults, errors: null };
};

export const actions: Actions = {
	default: async (event) => {
		await requireNationalAdmin(event);

		const formData = await event.request.formData();
		const payload = {
			name: formData.get('name'),
			contactEmail: formData.get('contactEmail'),
			contactPhone: formData.get('contactPhone'),
			isActive: formData.get('isActive') ?? false
		};

		const parsed = partnerCreateSchema.safeParse(payload);

		if (!parsed.success) {
			return fail(400, {
				values: {
					name: String(payload.name ?? ''),
					contactEmail: (payload.contactEmail as string | null) ?? '',
					contactPhone: (payload.contactPhone as string | null) ?? '',
					isActive: payload.isActive === true || payload.isActive === 'on' || payload.isActive === 'true'
				},
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const { name, contactEmail, contactPhone, isActive } = parsed.data;

		const inserted = await db.insert(partners).values({
			name,
			contactEmail,
			contactPhone,
			isActive,
			comments: parsed.data.comments,
			createdBy: event.locals.user?.id ?? null
		}).returning({ id: partners.id, code: partners.code });

		if (inserted[0]?.id) {
			await logAudit({
				event,
				userId: event.locals.user?.id,
				action: 'partner_created',
				entityType: 'partner',
				entityId: inserted[0].id,
				oldData: null,
				newData: { id: inserted[0].id, code: inserted[0].code, name, contactEmail, contactPhone, isActive }
			});
		}

		throw redirect(303, '/partners');
	}
};
