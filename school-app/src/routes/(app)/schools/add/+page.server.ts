import { db } from '$lib/server/db';
import { schools, districts, partners } from '$lib/server/db/schema';
import { requireRole, UserRole } from '$lib/server/guards';
import { schoolCreateSchema, type SchoolCreateInput } from '$lib/validation/school';
import { fail, redirect } from '@sveltejs/kit';
import { eq, and, ilike } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';

const defaults: SchoolCreateInput = {
	name: '',
	districtId: '',
	partnerId: '',
	address: '',
	principalName: '',
	contactPhone: '',
	schoolType: undefined,
	areaType: undefined,
	gpsLatitude: '',
	gpsLongitude: '',
	hasPrimary: false,
	hasMiddle: false,
	hasTenth: false,
	has12th: false,
	coEdType: undefined,
	totalStudentStrength: '',
	comments: ''
};

export const load: PageServerLoad = async (event) => {
	const currentUser = await requireRole(event, UserRole.NATIONAL_ADMIN, UserRole.DATA_MANAGER, UserRole.PARTNER_MANAGER);
	const lockPartner = currentUser.role === 'partner_manager';
	const lockedPartnerId = lockPartner ? currentUser.partnerId : null;

	if (lockPartner && !lockedPartnerId) {
		return fail(400, { message: 'Partner Manager must be assigned to a partner before creating schools.' });
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
		.where(lockPartner ? eq(districts.partnerId, lockedPartnerId!) : undefined)
		.orderBy(districts.name);

	return {
		values: { ...defaults, partnerId: lockedPartnerId ?? defaults.partnerId },
		errors: null,
		districts: districtsList,
		lockPartner,
		lockedPartnerId
	};
};

export const actions: Actions = {
	default: async (event) => {
		const currentUser = await requireRole(event, UserRole.NATIONAL_ADMIN, UserRole.DATA_MANAGER, UserRole.PARTNER_MANAGER);
		const lockPartner = currentUser.role === 'partner_manager';
		const lockedPartnerId = lockPartner ? currentUser.partnerId : null;

		const formData = await event.request.formData();
		const payload = {
			name: formData.get('name'),
			districtId: formData.get('districtId'),
			partnerId: lockPartner ? lockedPartnerId : formData.get('partnerId'),
			address: formData.get('address'),
			principalName: formData.get('principalName'),
			contactPhone: formData.get('contactPhone'),
			schoolType: formData.get('schoolType'),
			areaType: formData.get('areaType'),
			gpsLatitude: formData.get('gpsLatitude'),
			gpsLongitude: formData.get('gpsLongitude'),
			hasPrimary: formData.get('hasPrimary') === 'on',
			hasMiddle: formData.get('hasMiddle') === 'on',
			hasTenth: formData.get('hasTenth') === 'on',
			has12th: formData.get('has12th') === 'on',
			coEdType: formData.get('coEdType'),
			totalStudentStrength: formData.get('totalStudentStrength'),
			comments: formData.get('comments')
		};

		console.log('[SCHOOL ADD] Payload received:', JSON.stringify(payload, null, 2));
		const parsed = schoolCreateSchema.safeParse(payload);
		console.log('[SCHOOL ADD] Validation result:', parsed.success ? 'PASSED' : 'FAILED');
		if (!parsed.success) {
			console.log('[SCHOOL ADD] Validation errors:', parsed.error.flatten().fieldErrors);
		}

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
				.where(lockPartner ? eq(districts.partnerId, lockedPartnerId!) : undefined)
				.orderBy(districts.name);

			return fail(400, {
				values: {
					name: String(payload.name ?? ''),
					districtId: String(payload.districtId ?? ''),
					partnerId: String(payload.partnerId ?? ''),
					address: String(payload.address ?? ''),
					principalName: String(payload.principalName ?? ''),
					contactPhone: String(payload.contactPhone ?? ''),
					schoolType: String(payload.schoolType ?? ''),
					areaType: String(payload.areaType ?? ''),
					gpsLatitude: String(payload.gpsLatitude ?? ''),
					gpsLongitude: String(payload.gpsLongitude ?? ''),
					hasPrimary: payload.hasPrimary ?? false,
					hasMiddle: payload.hasMiddle ?? false,
					hasTenth: payload.hasTenth ?? false,
					has12th: payload.has12th ?? false,
					coEdType: String(payload.coEdType ?? ''),
					totalStudentStrength: String(payload.totalStudentStrength ?? ''),
						comments: String(payload.comments ?? '')
					},
				errors: parsed.error.flatten().fieldErrors,
				districts: districtsList,
				lockPartner,
				lockedPartnerId
			});
		}

		const { name, districtId, partnerId, address, principalName, contactPhone, schoolType, areaType, gpsLatitude, gpsLongitude, hasPrimary, hasMiddle, hasTenth, has12th, coEdType, totalStudentStrength, comments } = parsed.data;

		// Enforce partner scoping for Partner Manager (district must belong to their partner)
		if (lockPartner && lockedPartnerId) {
			const [districtRow] = await db
				.select({ partnerId: districts.partnerId })
				.from(districts)
				.where(eq(districts.id, districtId))
				.limit(1);
			if (!districtRow || districtRow.partnerId !== lockedPartnerId) {
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
					.where(eq(districts.partnerId, lockedPartnerId))
					.orderBy(districts.name);

				return fail(403, {
					values: { ...parsed.data, partnerId: lockedPartnerId },
					errors: { districtId: ['You can only create schools within your partner districts'] },
					districts: districtsList,
					lockPartner,
					lockedPartnerId
				});
			}
		}

		// Check for duplicate school (case-insensitive) in the same district
		const normalizedName = name.trim().toUpperCase();
		const existingSchool = await db
			.select({ id: schools.id })
			.from(schools)
			.where(and(eq(schools.districtId, districtId), ilike(schools.name, normalizedName)))
			.limit(1);

		if (existingSchool.length > 0) {
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
					name: String(payload.name ?? ''),
					districtId: String(payload.districtId ?? ''),
					partnerId: String(payload.partnerId ?? ''),
					address: String(payload.address ?? ''),
					principalName: String(payload.principalName ?? ''),
					contactPhone: String(payload.contactPhone ?? ''),
					schoolType: String(payload.schoolType ?? ''),
					areaType: String(payload.areaType ?? ''),
					gpsLatitude: String(payload.gpsLatitude ?? ''),
					gpsLongitude: String(payload.gpsLongitude ?? ''),
					hasPrimary: payload.hasPrimary ?? false,
					hasMiddle: payload.hasMiddle ?? false,
					hasTenth: payload.hasTenth ?? false,
					has12th: payload.has12th ?? false,
					coEdType: String(payload.coEdType ?? ''),
					totalStudentStrength: String(payload.totalStudentStrength ?? ''),
					comments: String(payload.comments ?? '')
				},
				errors: {
					name: [`A school with this name already exists in this district`]
				},
				districts: districtsList
			});
		}

		console.log('[SCHOOL ADD] Attempting to insert school:', { name, districtId, partnerId });
		const schoolValues: any = {
			name,
			districtId,
			partnerId,
			address: address || null,
			principalName: principalName || null,
			contactPhone: contactPhone || null,
			schoolType: (schoolType as any) || null,
			areaType: (areaType as any) || null,
			gpsLatitude: gpsLatitude ? parseFloat(gpsLatitude) : null,
			gpsLongitude: gpsLongitude ? parseFloat(gpsLongitude) : null,
			hasPrimary: hasPrimary ?? false,
			hasMiddle: hasMiddle ?? false,
			hasTenth: hasTenth ?? false,
			has12th: has12th ?? false,
			coEdType: coEdType || null,
			totalStudentStrength: totalStudentStrength ? parseInt(totalStudentStrength, 10) : null,
			comments: comments || null
		};
		const inserted = await db
			.insert(schools)
			.values(schoolValues)
			.returning({ id: schools.id, code: schools.code });

		console.log('[SCHOOL ADD] Insert result:', inserted);
		if (inserted[0]?.id) {
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
				action: 'school_created',
				entityType: 'school',
				entityId: inserted[0].id,
				oldData: null,
				newData: {
					id: inserted[0].id,
					code: inserted[0].code,
					name,
					districtId,
					districtName: district[0]?.name,
					districtState: district[0]?.state,
					partnerId,
					partnerName: partner[0]?.name,
					address,
					principalName,
					contactPhone,
					schoolType,
					areaType,
					gpsLatitude,
					gpsLongitude,
					hasPrimary,
					hasMiddle,
					hasTenth,
					has12th,
					coEdType,
					totalStudentStrength,
					comments
				}
			});
		}

		throw redirect(303, '/schools');
	}
};
