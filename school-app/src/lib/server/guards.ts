import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { schools, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Role names align with the legacy schema and routes
export enum UserRole {
	NATIONAL_ADMIN = 'national_admin',
	DATA_MANAGER = 'data_manager',
	PARTNER_MANAGER = 'partner_manager',
	TEAM_MEMBER = 'team_member'
}

/**
 * Type for authenticated user from session
 */
export interface AuthenticatedUser {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	partnerId: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	lastLoginAt: Date | null;
	createdBy: string | null;
}

/**
 * Guard to ensure user is authenticated
 */
export async function requireAuth(event: RequestEvent) {
	const user = event.locals.user as AuthenticatedUser | null;

	if (!user) {
		throw error(401, 'Unauthorized - Please login first');
	}

	return user;
}

/**
 * Guard to ensure user has specific role(s)
 */
export async function requireRole(event: RequestEvent, ...roles: UserRole[]) {
	const user = await requireAuth(event);

	if (!roles.includes(user.role as UserRole)) {
		throw error(403, `Forbidden - Requires one of: ${roles.join(', ')}`);
	}

	return user;
}

export async function requireNationalAdmin(event: RequestEvent) {
	return requireRole(event, UserRole.NATIONAL_ADMIN);
}

export async function requirePartnerManager(event: RequestEvent) {
	return requireRole(event, UserRole.NATIONAL_ADMIN, UserRole.PARTNER_MANAGER);
}

/**
 * Guard to ensure user can create users at or below their role level
 */
export async function requireUserCreationAccess(event: RequestEvent, targetRole: UserRole) {
	const user = await requireAuth(event);

	// Define role hierarchy
	const roleHierarchy = {
		[UserRole.NATIONAL_ADMIN]: 4,
		[UserRole.DATA_MANAGER]: 3,
		[UserRole.PARTNER_MANAGER]: 2,
		[UserRole.TEAM_MEMBER]: 1
	};

	const userLevel = roleHierarchy[user.role as UserRole];
	const targetLevel = roleHierarchy[targetRole];

	if (!userLevel || !targetLevel) {
		throw error(400, 'Invalid role specified');
	}

	// Admin and partner managers can create below their level
	if (userLevel > targetLevel) {
		return user;
	}

	// Allow National Admin to create other National Admins
	if (user.role === UserRole.NATIONAL_ADMIN && targetRole === UserRole.NATIONAL_ADMIN) {
		return user;
	}

	throw error(403, `Forbidden - You do not have permission to create users with role: ${targetRole}`);
}

/**
 * Guard to ensure user can view/edit users at or below their role level
 */
export async function requireUserAccess(event: RequestEvent, targetUserId: string) {
	const user = await requireAuth(event);

	// Users can always edit their own profile
	if (user.id === targetUserId) {
		return user;
	}

	// Admin-like roles can access any user (current policy).
	if (user.role === UserRole.NATIONAL_ADMIN || user.role === UserRole.DATA_MANAGER) {
		return user;
	}

	// Team members cannot access other users.
	if (user.role === UserRole.TEAM_MEMBER) {
		throw error(403, 'Forbidden - You do not have permission to access this user');
	}

	// Partner managers can access only users in their partner.
	if (user.role === UserRole.PARTNER_MANAGER) {
		if (!user.partnerId) {
			throw error(403, 'Forbidden - User is not assigned to a partner');
		}

		const [target] = await db
			.select({ partnerId: users.partnerId })
			.from(users)
			.where(eq(users.id, targetUserId))
			.limit(1);

		if (!target) {
			throw error(404, 'User not found');
		}

		if (target.partnerId !== user.partnerId) {
			throw error(403, 'Forbidden - You do not have permission to access this user');
		}

		return user;
	}

	throw error(403, 'Forbidden - You do not have permission to access this user');
}

/**
 * Guard to ensure user can edit a school record.
 * - national_admin: any school
 * - data_manager: any school (current policy)
 * - partner_manager: only schools in their partner
 */
export async function requireSchoolEditAccess(event: RequestEvent, schoolId: string) {
	const user = await requireAuth(event);

	if (user.role === UserRole.NATIONAL_ADMIN || user.role === UserRole.DATA_MANAGER) {
		return user;
	}

	if (user.role !== UserRole.PARTNER_MANAGER) {
		throw error(403, 'Forbidden - You do not have permission to edit schools');
	}

	if (!user.partnerId) {
		throw error(403, 'Forbidden - User is not assigned to a partner');
	}

	const [row] = await db
		.select({ partnerId: schools.partnerId })
		.from(schools)
		.where(eq(schools.id, schoolId))
		.limit(1);

	if (!row) {
		throw error(404, 'School not found');
	}

	if (row.partnerId !== user.partnerId) {
		throw error(403, 'Forbidden - You do not have permission to edit this school');
	}

	return user;
}

/**
 * Guard to ensure user belongs to a partner
 */
export async function requirePartnerMembership(event: RequestEvent) {
	const user = await requireAuth(event);

	if (!user.partnerId) {
		throw error(403, 'Forbidden - User is not assigned to a partner');
	}

	return user;
}

/**
 * Guard to ensure user can access partner data
 * (National admin can see all, partner staff can only see their partner's data)
 */
export async function requirePartnerDataAccess(event: RequestEvent, targetPartnerId: string) {
	const user = await requireAuth(event);

	// National admin can access any partner's data
	if (user.role === UserRole.NATIONAL_ADMIN) {
		return user;
	}

	// Partner staff can only access their own partner's data
	if (user.partnerId !== targetPartnerId) {
		throw error(403, 'Forbidden - You do not have access to this partner\'s data');
	}

	return user;
}

/**
 * Guard to ensure user can edit survey data based on time windows
 * - Team members: 24 hours after submission
 * - Partner managers: 15 days after submission
 * - National admin: No time limit
 */
export function canEditSurvey(
	user: AuthenticatedUser,
	submittedAt: Date,
	submittedBy: string
): boolean {
	if (user.role === UserRole.NATIONAL_ADMIN) {
		return true;
	}

	const now = new Date();
	const submittedTime = new Date(submittedAt);
	const elapsedMs = now.getTime() - submittedTime.getTime();

	// Note: These role names are from old system, need to be updated
	// when survey system is migrated to new role hierarchy
	if (user.role === UserRole.TEAM_MEMBER) {
		// Team members: 24 hours
		const hoursElapsed = elapsedMs / (1000 * 60 * 60);
		return hoursElapsed <= 24;
	}

	if (user.role === UserRole.PARTNER_MANAGER) {
		// Partner managers: 15 days
		const daysElapsed = elapsedMs / (1000 * 60 * 60 * 24);
		return daysElapsed <= 15;
	}

	return false;
}

export const requireCentralAdmin = requireNationalAdmin; // alias kept for older calls
export const requirePartnerSiteManager = requirePartnerManager; // alias kept for older calls
export const requireDataAccess = requireNationalAdmin;
