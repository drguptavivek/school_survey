import { db } from '$lib/server/db';
import { users, partners } from '$lib/server/db/schema';
import { requirePartnerManager, requireUserCreationAccess, UserRole } from '$lib/server/guards';
import { userCreateSchema, type UserCreateInput } from '$lib/validation/user';
import { fail, redirect } from '@sveltejs/kit';
import { eq, and, ilike } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';
import { createUserWithGeneratedFields, formatDateForDB, getAvailableRoleOptions } from '$lib/server/user-utils';

const defaults: UserCreateInput = {
	name: '',
	email: '',
	phoneNumber: '',
	role: 'team_member', // Default role
	partnerId: '',
	active: 'Y',
	dateActiveTill: '',
	yearsOfExperience: ''
};

export const load: PageServerLoad = async (event) => {
	const user = await requirePartnerManager(event);

	const lockPartner = user.role === 'partner_manager';
	const lockedPartnerId = lockPartner ? user.partnerId : null;
	const reset = event.url.searchParams.has('new');

	if (lockPartner && !lockedPartnerId) {
		throw fail(400, { message: 'Partner Manager must be assigned to a partner before creating users.' });
	}

	// Get partners for dropdown
	const partnersList = lockPartner
		? await db
				.select({ id: partners.id, name: partners.name })
				.from(partners)
				.where(eq(partners.id, lockedPartnerId!))
				.orderBy(partners.name)
		: await db
				.select({ id: partners.id, name: partners.name })
				.from(partners)
				.orderBy(partners.name);

	// Get available role options based on current user's role
	const roleOptions = getAvailableRoleOptions(user.role);

	return {
		values: { ...defaults, partnerId: lockedPartnerId ?? defaults.partnerId },
		errors: null,
		partners: partnersList,
		roleOptions,
		lockPartner,
		lockedPartnerId,
		reset
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = await requirePartnerManager(event);
		const lockPartner = user.role === 'partner_manager';
		const lockedPartnerId = lockPartner ? user.partnerId : null;

		if (lockPartner && !lockedPartnerId) {
			return fail(400, { errors: { partnerId: ['Your account is not assigned to a partner'] } });
		}

		const formData = await event.request.formData();
		const payload = {
			name: formData.get('name'),
			email: formData.get('email'),
			phoneNumber: formData.get('phoneNumber'),
			role: formData.get('role'),
			partnerId: lockPartner ? lockedPartnerId : (formData.get('partnerId') ?? ''),
			active: formData.get('active'),
			dateActiveTill: formData.get('dateActiveTill'),
			yearsOfExperience: formData.get('yearsOfExperience')
		};

		console.log('[USER ADD] Payload received:', JSON.stringify(payload, null, 2));
		const parsed = userCreateSchema.safeParse(payload);
		console.log('[USER ADD] Validation result:', parsed.success ? 'PASSED' : 'FAILED');
		if (!parsed.success) {
			console.log('[USER ADD] Validation errors:', parsed.error.flatten().fieldErrors);
		}

		if (!parsed.success) {
			// Re-fetch partners for dropdown
			const partnersList = lockPartner
				? await db
						.select({ id: partners.id, name: partners.name })
						.from(partners)
						.where(eq(partners.id, lockedPartnerId!))
						.orderBy(partners.name)
				: await db
						.select({ id: partners.id, name: partners.name })
						.from(partners)
						.orderBy(partners.name);

			const roleOptions = getAvailableRoleOptions(user.role);

			return fail(400, {
				values: {
					name: String(payload.name ?? ''),
					email: String(payload.email ?? ''),
					phoneNumber: String(payload.phoneNumber ?? ''),
					role: String(payload.role ?? ''),
					partnerId: String(payload.partnerId ?? ''),
					active: String(payload.active ?? 'Y'),
					dateActiveTill: String(payload.dateActiveTill ?? ''),
					yearsOfExperience: String(payload.yearsOfExperience ?? '')
				},
				errors: parsed.error.flatten().fieldErrors,
				partners: partnersList,
				roleOptions,
				lockPartner,
				lockedPartnerId
			});
		}

		// Check if current user can create this role
		if (!await requireUserCreationAccess(event, parsed.data.role as UserRole)) {
			const partnersList = lockPartner
				? await db
						.select({ id: partners.id, name: partners.name })
						.from(partners)
						.where(eq(partners.id, lockedPartnerId!))
						.orderBy(partners.name)
				: await db
						.select({ id: partners.id, name: partners.name })
						.from(partners)
						.orderBy(partners.name);

			const roleOptions = getAvailableRoleOptions(user.role);

			return fail(403, {
				values: {
					name: String(payload.name ?? ''),
					email: String(payload.email ?? ''),
					phoneNumber: String(payload.phoneNumber ?? ''),
					role: String(payload.role ?? ''),
					partnerId: String(payload.partnerId ?? ''),
					active: String(payload.active ?? 'Y'),
					dateActiveTill: String(payload.dateActiveTill ?? ''),
					yearsOfExperience: String(payload.yearsOfExperience ?? '')
				},
				errors: {
					role: ['You do not have permission to create users with this role']
				},
				partners: partnersList,
				roleOptions,
				lockPartner,
				lockedPartnerId
			});
		}

		const { name, email, phoneNumber, role, active, dateActiveTill, yearsOfExperience } = parsed.data;
		const partnerId = parsed.data.partnerId || null;

		// Check for duplicate email
		const existingUser = await db
			.select({ id: users.id })
			.from(users)
			.where(ilike(users.email, email))
			.limit(1);

		if (existingUser.length > 0) {
			const partnersList = lockPartner
				? await db
						.select({ id: partners.id, name: partners.name })
						.from(partners)
						.where(eq(partners.id, lockedPartnerId!))
						.orderBy(partners.name)
				: await db
						.select({ id: partners.id, name: partners.name })
						.from(partners)
						.orderBy(partners.name);

			const roleOptions = getAvailableRoleOptions(user.role);

			return fail(400, {
				values: {
					name: String(payload.name ?? ''),
					email: String(payload.email ?? ''),
					phoneNumber: String(payload.phoneNumber ?? ''),
					role: String(payload.role ?? ''),
					partnerId: String(payload.partnerId ?? ''),
					active: String(payload.active ?? 'Y'),
					dateActiveTill: String(payload.dateActiveTill ?? ''),
					yearsOfExperience: String(payload.yearsOfExperience ?? '')
				},
				errors: {
					email: ['A user with this email already exists']
				},
				partners: partnersList,
				roleOptions,
				lockPartner,
				lockedPartnerId
			});
		}

			console.log('[USER ADD] Attempting to insert user:', { name, email, role });
		
		// Generate user with auto-generated fields
		const userData = await createUserWithGeneratedFields({
			name,
			email,
			phoneNumber,
			role,
			partnerId,
			isActive: active === 'Y',
			dateActiveTill: formatDateForDB(dateActiveTill),
			yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
			createdBy: user.id
		});

		const inserted = await db
			.insert(users)
			.values({
				name: userData.name,
				email: userData.email,
				passwordHash: userData.passwordHash,
				role: userData.role,
				partnerId: userData.partnerId,
				code: userData.code,
				phoneNumber: userData.phoneNumber,
				isActive: userData.isActive,
				dateActiveTill: userData.dateActiveTill,
				yearsOfExperience: userData.yearsOfExperience,
				temporaryPassword: userData.temporaryPassword,
				createdBy: userData.createdBy
			})
			.returning({ 
				id: users.id, 
				code: users.code, 
				temporaryPassword: users.temporaryPassword 
			});

		console.log('[USER ADD] Insert result:', inserted);
			if (inserted[0]?.id) {
				const roleOptions = getAvailableRoleOptions(user.role);
				const partnersList = lockPartner
					? await db
							.select({ id: partners.id, name: partners.name })
							.from(partners)
							.where(eq(partners.id, lockedPartnerId!))
							.orderBy(partners.name)
					: await db
							.select({ id: partners.id, name: partners.name })
							.from(partners)
							.orderBy(partners.name);

				await logAudit({
					event,
					userId: event.locals.user?.id,
					action: 'user_created',
					entityType: 'user',
				entityId: inserted[0].id,
				oldData: null,
				newData: {
					id: inserted[0].id,
					code: inserted[0].code,
					name,
					email,
					phoneNumber,
					role,
					isActive: active === 'Y',
					dateActiveTill: userData.dateActiveTill,
					yearsOfExperience: userData.yearsOfExperience,
					temporaryPassword: inserted[0].temporaryPassword // Include temp password in audit
				}
			});

				// Return generated credentials for display (stay on page)
				return {
					values: {
						name: String(payload.name ?? ''),
						email: String(payload.email ?? ''),
						phoneNumber: String(payload.phoneNumber ?? ''),
						role: String(payload.role ?? ''),
						partnerId: String(payload.partnerId ?? ''),
						active: String(payload.active ?? 'Y'),
						dateActiveTill: String(payload.dateActiveTill ?? ''),
						yearsOfExperience: String(payload.yearsOfExperience ?? '')
					},
					errors: null,
					partners: partnersList,
					roleOptions,
					lockPartner,
					lockedPartnerId,
					generatedCode: inserted[0]?.code || '',
					// Use server-generated temp password (shown only once)
					generatedPassword: userData.temporaryPassword || ''
				};
			}

		throw redirect(303, '/users');
	}
};
