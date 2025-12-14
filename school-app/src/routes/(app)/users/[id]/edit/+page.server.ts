import { db } from '$lib/server/db';
import { users, partners } from '$lib/server/db/schema';
import { requireUserAccess } from '$lib/server/guards';
import { userUpdateSchema, type UserUpdateInput } from '$lib/validation/user';
import { fail, redirect } from '@sveltejs/kit';
import { eq, and, ilike } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { logAudit } from '$lib/server/audit';
import { formatDateForDB, formatDateForDisplay } from '$lib/server/user-utils';

export const load: PageServerLoad = async (event) => {
	const userId = event.params.id as string;
	const currentUser = await requireUserAccess(event, userId);

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

	return {
		values: {
			name: user.name,
			email: user.email,
			phoneNumber: user.phoneNumber || '',
			role: user.role,
			active: user.isActive ? 'Y' : 'N',
			dateActiveTill: formatDateForDisplay(user.dateActiveTill?.toISOString().split('T')[0]) || '',
			yearsOfExperience: user.yearsOfExperience?.toString() || ''
		},
		errors: null,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
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

		const formData = await event.request.formData();
		const payload = {
			name: formData.get('name'),
			email: formData.get('email'),
			phoneNumber: formData.get('phoneNumber'),
			role: formData.get('role'),
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
					phoneNumber: users.phoneNumber,
					role: users.role,
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
					active: String(payload.active ?? 'Y'),
					dateActiveTill: String(payload.dateActiveTill ?? ''),
					yearsOfExperience: String(payload.yearsOfExperience ?? '')
				},
				errors: parsed.error.flatten().fieldErrors,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					isActive: user.isActive,
					dateActiveTill: user.dateActiveTill,
					yearsOfExperience: user.yearsOfExperience
				}
			});
		}

		const { name, email, phoneNumber, role, active, dateActiveTill, yearsOfExperience } = parsed.data;

		// Check for duplicate email (excluding current user)
		const existingUser = await db
			.select({ id: users.id })
			.from(users)
			.where(and(ilike(users.email, email), eq(users.id, userId)))
			.limit(1);

		if (existingUser.length > 0 && existingUser[0].id !== userId) {
			const userData = await db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					phoneNumber: users.phoneNumber,
					role: users.role,
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
					active: String(payload.active ?? 'Y'),
					dateActiveTill: String(payload.dateActiveTill ?? ''),
					yearsOfExperience: String(payload.yearsOfExperience ?? '')
				},
				errors: {
					email: ['A user with this email already exists']
				},
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
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
				isActive: active === 'Y',
				dateActiveTill: formatDateForDB(dateActiveTill),
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
					isActive: updatedUser[0].isActive,
					dateActiveTill: updatedUser[0].dateActiveTill,
					yearsOfExperience: updatedUser[0].yearsOfExperience
				}
			});
		}

		throw redirect(303, '/users');
	}
};