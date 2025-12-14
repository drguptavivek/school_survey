import { db } from '$lib/server/db';
import { users, partners } from '$lib/server/db/schema';
import { canAssignUserRole, requireUserAccess, UserRole } from '$lib/server/guards';
import { userUpdateSchema, type UserUpdateInput } from '$lib/validation/user';
import { fail, redirect } from '@sveltejs/kit';
import { eq, and, ilike, ne } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';
import { formatDateForDB, formatDateForDisplay, getAvailableRoleOptions } from '$lib/server/user-utils';

export const load: PageServerLoad = async (event) => {
	const userId = event.params.id as string;
	const currentUser = await requireUserAccess(event, userId);

	const lockPartner = currentUser.role === 'partner_manager';
	const lockedPartnerId = lockPartner ? currentUser.partnerId : null;
	const isSelf = currentUser.id === userId;

	// Partners list for dropdown (only used for certain roles)
	const partnersList = lockPartner
		? lockedPartnerId
			? await db
					.select({ id: partners.id, name: partners.name })
					.from(partners)
					.where(eq(partners.id, lockedPartnerId))
					.orderBy(partners.name)
			: []
		: await db
				.select({ id: partners.id, name: partners.name })
				.from(partners)
				.orderBy(partners.name);

	// Get user data
	let userData;
	try {
		userData = await db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					code: users.code,
					phoneNumber: users.phoneNumber,
					partnerId: users.partnerId,
					role: users.role,
					isActive: users.isActive,
					dateActiveTill: users.dateActiveTill,
					yearsOfExperience: users.yearsOfExperience,
				temporaryPassword: users.temporaryPassword,
				partnerName: partners.name,
				createdAt: users.createdAt,
				lastLoginAt: users.lastLoginAt
			})
			.from(users)
			.leftJoin(partners, eq(users.partnerId, partners.id))
			.where(eq(users.id, userId))
			.limit(1);
	} catch (error) {
		console.error('[USER EDIT] Database query failed:', error);
		throw fail(500, { message: 'Database error occurred' });
	}

	if (!userData || userData.length === 0) {
		throw fail(404, { message: 'User not found' });
	}

	const user = userData[0];
	const dateActiveTillIso = user.dateActiveTill ? String(user.dateActiveTill) : '';

		const roleOptions = (() => {
			const options = getAvailableRoleOptions(currentUser.role);
			if (isSelf && !options.some((o) => o.value === currentUser.role)) {
				options.unshift({
					value: currentUser.role,
					label: currentUser.role
						.split('_')
						.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
						.join(' ')
				});
			}
			return options;
		})();

		return {
			values: {
				id: user.id,
				name: user.name,
				email: user.email,
				phoneNumber: user.phoneNumber || '',
				role: user.role,
				partnerId: lockPartner ? lockedPartnerId || '' : user.partnerId || '',
				active: user.isActive ? 'Y' : 'N',
				dateActiveTill: formatDateForDisplay(dateActiveTillIso) || '',
				yearsOfExperience: user.yearsOfExperience?.toString() || ''
			},
			errors: null,
			partners: partnersList,
			lockPartner,
			lockedPartnerId,
			isSelf,
			roleOptions,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
			code: user.code,
			phoneNumber: user.phoneNumber,
			partnerId: user.partnerId,
			role: user.role,
			isActive: user.isActive,
			dateActiveTill: user.dateActiveTill,
			yearsOfExperience: user.yearsOfExperience,
			partnerName: user.partnerName,
			createdAt: user.createdAt,
			lastLoginAt: user.lastLoginAt
		}
	};
};

export const actions: Actions = {
	default: async (event) => {
		const userId = event.params.id as string;
		const currentUser = await requireUserAccess(event, userId);
		const lockPartner = currentUser.role === 'partner_manager';
		const lockedPartnerId = lockPartner ? currentUser.partnerId : null;
		const isSelf = currentUser.id === userId;
		const roleOptions = (() => {
			const options = getAvailableRoleOptions(currentUser.role);
			if (isSelf && !options.some((o) => o.value === currentUser.role)) {
				options.unshift({
					value: currentUser.role,
					label: currentUser.role
						.split('_')
						.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
						.join(' ')
				});
			}
			return options;
		})();

		const formData = await event.request.formData();
		const payload = {
			id: userId,
			name: formData.get('name'),
			email: formData.get('email'),
			phoneNumber: formData.get('phoneNumber'),
			role: formData.get('role'),
			partnerId: lockPartner ? lockedPartnerId : (formData.get('partnerId') ?? ''),
			active: formData.get('active'),
			dateActiveTill: formData.get('dateActiveTill'),
			yearsOfExperience: formData.get('yearsOfExperience')
		};

		console.log('[USER EDIT] Payload received:', JSON.stringify(payload, null, 2));
		const parsed = userUpdateSchema.safeParse(payload);
		console.log('[USER EDIT] Validation result:', parsed.success ? 'PASSED' : 'FAILED');
		if (!parsed.success) {
			console.log('[USER EDIT] Validation errors:', parsed.error.flatten().fieldErrors);
		}

		if (!parsed.success) {
			// Get current user data for form repopulation
			const userData = await db
					.select({
						id: users.id,
						name: users.name,
						email: users.email,
						code: users.code,
						phoneNumber: users.phoneNumber,
						role: users.role,
						partnerId: users.partnerId,
						isActive: users.isActive,
						dateActiveTill: users.dateActiveTill,
						yearsOfExperience: users.yearsOfExperience
					})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			const user = userData[0];

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
						partners: await db
							.select({ id: partners.id, name: partners.name })
							.from(partners)
							.orderBy(partners.name),
						lockPartner,
						lockedPartnerId,
						isSelf,
						roleOptions,
						user: {
							id: user.id,
							name: user.name,
							email: user.email,
						phoneNumber: user.phoneNumber,
						partnerId: user.partnerId,
						role: user.role,
						isActive: user.isActive,
						dateActiveTill: user.dateActiveTill,
						yearsOfExperience: user.yearsOfExperience
					}
				});
			}

				const { name, email, phoneNumber, role, partnerId, active, dateActiveTill, yearsOfExperience } =
					parsed.data;

			// Enforce role assignment permissions on edit (Partner Managers must not promote users)
			const nextRole = role as UserRole;
				if (!canAssignUserRole(currentUser.role as UserRole, nextRole)) {
					return fail(403, {
					values: {
						name,
						email,
						phoneNumber,
						role,
						partnerId: String(partnerId ?? ''),
						active,
						dateActiveTill: String(dateActiveTill ?? ''),
						yearsOfExperience: String(yearsOfExperience ?? '')
					},
						errors: {
							role: ['You do not have permission to assign this role']
						},
						partners: await db.select({ id: partners.id, name: partners.name }).from(partners).orderBy(partners.name),
						lockPartner,
						lockedPartnerId,
						isSelf,
						roleOptions
					});
				}

			// Partner is only applicable for partner-scoped roles.
			const partnerIdForDb = nextRole === 'partner_manager' || nextRole === 'team_member' ? partnerId || null : null;

		// Check for duplicate email (excluding current user)
		const existingUser = await db
			.select({ id: users.id })
			.from(users)
			.where(and(ilike(users.email, email), ne(users.id, userId)))
			.limit(1);

		if (existingUser.length > 0 && existingUser[0].id !== userId) {
			const userData = await db
					.select({
						id: users.id,
						name: users.name,
						email: users.email,
						code: users.code,
						phoneNumber: users.phoneNumber,
						role: users.role,
						partnerId: users.partnerId,
						isActive: users.isActive,
						dateActiveTill: users.dateActiveTill,
						yearsOfExperience: users.yearsOfExperience
					})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			const user = userData[0];

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
						partners: await db
							.select({ id: partners.id, name: partners.name })
							.from(partners)
							.orderBy(partners.name),
						lockPartner,
						lockedPartnerId,
						isSelf,
						roleOptions,
						user: {
							id: user.id,
							name: user.name,
							email: user.email,
						phoneNumber: user.phoneNumber,
						partnerId: user.partnerId,
						role: user.role,
						isActive: user.isActive,
						dateActiveTill: user.dateActiveTill,
						yearsOfExperience: user.yearsOfExperience
					}
				});
			}

		console.log('[USER EDIT] Attempting to update user:', { name, email, role, active });
				const updatedUser = await db
					.update(users)
					.set({
						name,
						email,
						phoneNumber,
						role,
						partnerId: partnerIdForDb,
						isActive: active === 'Y',
						dateActiveTill: formatDateForDB(dateActiveTill ?? ''),
						yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
						updatedAt: new Date()
					})
			.where(eq(users.id, userId))
				.returning({
					id: users.id,
					name: users.name,
					email: users.email,
					phoneNumber: users.phoneNumber,
					role: users.role,
					partnerId: users.partnerId,
					isActive: users.isActive,
					dateActiveTill: users.dateActiveTill,
					yearsOfExperience: users.yearsOfExperience
				});

		console.log('[USER EDIT] Update result:', updatedUser);
		if (updatedUser[0]?.id) {
			// Get old data for audit
			const oldUserData = await db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					phoneNumber: users.phoneNumber,
					role: users.role,
					partnerId: users.partnerId,
					isActive: users.isActive,
					dateActiveTill: users.dateActiveTill,
					yearsOfExperience: users.yearsOfExperience
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			const oldUser = oldUserData[0];

			await logAudit({
				event,
				userId: event.locals.user?.id,
				action: 'user_updated',
				entityType: 'user',
				entityId: updatedUser[0].id,
					oldData: {
						id: oldUser.id,
						name: oldUser.name,
						email: oldUser.email,
						phoneNumber: oldUser.phoneNumber,
						role: oldUser.role,
						partnerId: oldUser.partnerId,
						isActive: oldUser.isActive,
						dateActiveTill: oldUser.dateActiveTill,
						yearsOfExperience: oldUser.yearsOfExperience
					},
					newData: {
						id: updatedUser[0].id,
						name: updatedUser[0].name,
						email: updatedUser[0].email,
						phoneNumber: updatedUser[0].phoneNumber,
						role: updatedUser[0].role,
						partnerId: updatedUser[0].partnerId,
						isActive: updatedUser[0].isActive,
						dateActiveTill: updatedUser[0].dateActiveTill,
						yearsOfExperience: updatedUser[0].yearsOfExperience
					}
				});
		}

		throw redirect(303, '/users');
	}
};
