import { db } from '$lib/server/db';
import { schools, districts, partners } from '$lib/server/db/schema';
import { requireSchoolEditAccess } from '$lib/server/guards';
import { schoolUpdateSchema, type SchoolUpdateInput } from '$lib/validation/school';
import { fail, redirect, error } from '@sveltejs/kit';
import { eq, and, ilike, ne } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';

export const load: PageServerLoad = async (event) => {
	const { id } = event.params;
	await requireSchoolEditAccess(event, id);

	// Get the school to edit
	const school = await db
		.select({
			id: schools.id,
			name: schools.name,
			code: schools.code,
			districtId: schools.districtId,
			partnerId: schools.partnerId,
			hasPrimary: schools.hasPrimary,
			hasMiddle: schools.hasMiddle,
			hasTenth: schools.hasTenth,
			has12th: schools.has12th,
			address: schools.address,
			principalName: schools.principalName,
			contactPhone: schools.contactPhone
		})
		.from(schools)
		.where(eq(schools.id, id))
		.limit(1);

	if (school.length === 0) {
		throw error(404, 'School not found');
	}

	// Get all districts
	const districtsList = await db
		.select({
			id: districts.id,
			name: districts.name,
			state: districts.state,
			partnerId: districts.partnerId,
			partnerName: partners.name
		})
		.from(districts)
		.leftJoin(partners, eq(districts.partnerId, partners.id))
		.orderBy(districts.name);

	const values: SchoolUpdateInput = {
		id: school[0].id,
		name: school[0].name,
		districtId: school[0].districtId,
		partnerId: school[0].partnerId,
		hasPrimary: school[0].hasPrimary ?? false,
		hasMiddle: school[0].hasMiddle ?? false,
		hasTenth: school[0].hasTenth ?? false,
		has12th: school[0].has12th ?? false,
		address: school[0].address || '',
		principalName: school[0].principalName || '',
		contactPhone: school[0].contactPhone || ''
	};

	return {
		values,
		errors: null,
		school: school[0],
		districts: districtsList
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { id } = event.params;
		const user = await requireSchoolEditAccess(event, id);
		const formData = await event.request.formData();

		// Verify school exists and get current partner
		const existingSchool = await db
			.select({ id: schools.id, partnerId: schools.partnerId })
			.from(schools)
			.where(eq(schools.id, id))
			.limit(1);

		if (existingSchool.length === 0) {
			throw error(404, 'School not found');
		}

		const payload = {
			id,
			name: formData.get('name'),
			districtId: formData.get('districtId'),
			partnerId: formData.get('partnerId'),
			address: formData.get('address'),
			principalName: formData.get('principalName'),
			contactPhone: formData.get('contactPhone')
		};

		const parsed = schoolUpdateSchema.safeParse(payload);

		if (!parsed.success) {
			// Re-fetch districts for dropdown
			const districtsList = await db
				.select({
					id: districts.id,
					name: districts.name,
					state: districts.state,
					partnerId: districts.partnerId,
					partnerName: partners.name
				})
				.from(districts)
				.leftJoin(partners, eq(districts.partnerId, partners.id))
				.orderBy(districts.name);

			return fail(400, {
				values: {
					id: String(payload.id),
					name: String(payload.name ?? ''),
					districtId: String(payload.districtId ?? ''),
					partnerId: String(payload.partnerId ?? ''),
					address: String(payload.address ?? ''),
					principalName: String(payload.principalName ?? ''),
					contactPhone: String(payload.contactPhone ?? '')
				},
				errors: parsed.error.flatten().fieldErrors,
				districts: districtsList
			});
		}

		const { name, districtId, partnerId, address, principalName, contactPhone } = parsed.data;

		// For Partner Managers: Verify the new district belongs to their partner
		if (user.role === 'partner_manager' && user.partnerId) {
			const districtRow = await db
				.select({ partnerId: districts.partnerId })
				.from(districts)
				.where(eq(districts.id, districtId))
				.limit(1);

			if (!districtRow || districtRow[0].partnerId !== user.partnerId) {
				const districtsList = await db
					.select({
						id: districts.id,
						name: districts.name,
						state: districts.state,
						partnerId: districts.partnerId,
						partnerName: partners.name
					})
					.from(districts)
					.leftJoin(partners, eq(districts.partnerId, partners.id))
					.orderBy(districts.name);

				return fail(403, {
					values: {
						id: String(payload.id),
						name: String(payload.name ?? ''),
						districtId: String(payload.districtId ?? ''),
						partnerId: String(payload.partnerId ?? ''),
						address: String(payload.address ?? ''),
						principalName: String(payload.principalName ?? ''),
						contactPhone: String(payload.contactPhone ?? '')
					},
					errors: {
						districtId: ['You can only edit schools within your partner districts']
					},
					districts: districtsList
				});
			}
		}

		// Check for duplicate school (case-insensitive) in the same district, excluding current school
		const normalizedName = name.trim().toUpperCase();
		const duplicateSchool = await db
			.select({ id: schools.id })
			.from(schools)
			.where(
				and(
					eq(schools.districtId, districtId),
					ilike(schools.name, normalizedName),
					ne(schools.id, id)
				)
			)
			.limit(1);

		if (duplicateSchool.length > 0) {
			// Re-fetch districts for dropdown
			const districtsList = await db
				.select({
					id: districts.id,
					name: districts.name,
					state: districts.state,
					partnerId: districts.partnerId,
					partnerName: partners.name
				})
				.from(districts)
				.leftJoin(partners, eq(districts.partnerId, partners.id))
				.orderBy(districts.name);

			return fail(400, {
				values: {
					id: String(payload.id),
					name: String(payload.name ?? ''),
					districtId: String(payload.districtId ?? ''),
					partnerId: String(payload.partnerId ?? ''),
					address: String(payload.address ?? ''),
					principalName: String(payload.principalName ?? ''),
					contactPhone: String(payload.contactPhone ?? '')
				},
				errors: {
					name: [`A different school with this name already exists in this district`]
				},
				districts: districtsList
			});
		}

		// Get original school data for audit
		const originalSchool = await db
			.select({
				name: schools.name,
				districtId: schools.districtId,
				partnerId: schools.partnerId,
				address: schools.address,
				principalName: schools.principalName,
				contactPhone: schools.contactPhone
			})
			.from(schools)
			.where(eq(schools.id, id))
			.limit(1);

		// Update school
		const updated = await db
			.update(schools)
			.set({
				name,
				districtId,
				partnerId,
				address: address || null,
				principalName: principalName || null,
				contactPhone: contactPhone || null,
				updatedAt: new Date()
			})
			.where(eq(schools.id, id))
			.returning({ id: schools.id });

		if (updated[0]?.id) {
			// Get district and partner names for audit
			const district = await db
				.select({ name: districts.name, state: districts.state })
				.from(districts)
				.where(eq(districts.id, districtId))
				.limit(1);

			const partner = await db
				.select({ name: partners.name })
				.from(partners)
				.where(eq(partners.id, partnerId))
				.limit(1);

			await logAudit({
				event,
				userId: event.locals.user?.id,
				action: 'school_updated',
				entityType: 'school',
				entityId: updated[0].id,
				oldData: originalSchool[0],
				newData: {
					name,
					districtId,
					districtName: district[0]?.name,
					districtState: district[0]?.state,
					partnerId,
					partnerName: partner[0]?.name,
					address,
					principalName,
					contactPhone
				}
			});
		}

		throw redirect(303, '/schools');
	}
};
