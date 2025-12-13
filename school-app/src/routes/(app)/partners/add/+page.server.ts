import { db } from '$lib/server/db';
import { partners } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { partnerInputSchema, type PartnerInput } from '$lib/validation/partner';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

const defaults: PartnerInput = {
	name: '',
	code: '',
	contactEmail: null,
	contactPhone: null,
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

		await db.insert(partners).values({
			name,
			code,
			contactEmail,
			contactPhone,
			isActive,
			createdBy: event.locals.user?.id ?? null
		});

		throw redirect(303, '/partners');
	}
};
