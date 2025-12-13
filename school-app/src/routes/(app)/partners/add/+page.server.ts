import { db } from '$lib/server/db';
import { partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { partnerInputSchema, type PartnerInput } from '$lib/validation/partner';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';

const defaults: PartnerInput = {
	name: '',
	code: '',
	contactEmail: null,
	contactPhone: null,
	comments: null,
	isActive: true
};

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);
	const existingCodes = await db.select({ id: partners.id, code: partners.code }).from(partners);
	return { values: defaults, errors: null, existingCodes };
};

export const actions: Actions = {
	default: async (event) => {
		await requireNationalAdmin(event);

		const formData = await event.request.formData();
		const payload = {
			name: formData.get('name'),
			code: formData.get('code'),
			contactEmail: formData.get('contactEmail'),
			contactPhone: formData.get('contactPhone'),
			isActive: formData.get('isActive') ?? false
		};

		const parsed = partnerInputSchema.safeParse(payload);

		if (!parsed.success) {
			return fail(400, {
				values: {
					name: String(payload.name ?? ''),
					code: String(payload.code ?? ''),
					contactEmail: (payload.contactEmail as string | null) ?? '',
					contactPhone: (payload.contactPhone as string | null) ?? '',
					isActive: payload.isActive === true || payload.isActive === 'on' || payload.isActive === 'true'
				},
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const { name, code, contactEmail, contactPhone, isActive } = parsed.data;

		const exists = await db
			.select({ id: partners.id })
			.from(partners)
			.where(eq(partners.code, code))
			.limit(1);

		if (exists.length > 0) {
			return fail(400, {
				values: parsed.data,
				errors: { code: ['Code must be unique'] }
			});
		}

		const inserted = await db.insert(partners).values({
			name,
			code,
			contactEmail,
			contactPhone,
			isActive,
			comments: parsed.data.comments,
			createdBy: event.locals.user?.id ?? null
		}).returning({ id: partners.id });

		if (inserted[0]?.id) {
			await logAudit({
				event,
				userId: event.locals.user?.id,
				action: 'partner_created',
				entityType: 'partner',
				entityId: inserted[0].id,
				oldData: null,
				newData: { id: inserted[0].id, name, code, contactEmail, contactPhone, isActive }
			});
		}

		throw redirect(303, '/partners');
	}
};
