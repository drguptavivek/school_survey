import randomWord from 'random-word';
import { hash } from 'bcrypt';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Generate a secure temporary password using 3 random English words
 * Uses random-word library with 274,925 words for high entropy
 * @returns {string} Temporary password in format "word1-word2-word3"
 */
export function generateSecureTemporaryPassword(): string {
	const words = [];
	for (let i = 0; i < 3; i++) {
		words.push(randomWord());
	}
	return words.join('-');
}

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
	return await hash(password, 10);
}

/**
 * Generate user data with auto-generated code and temporary password
 * @param userData User input data
 * @returns {Promise<Object>} User data with generated fields
 */
export async function createUserWithGeneratedFields(userData: any) {
	const tempPassword = generateSecureTemporaryPassword();
	const hashedPassword = await hashPassword(tempPassword);

	// Get next user code from sequence
	const codeResult = await db.execute<{ code: string | number }>(sql`SELECT nextval('user_code_seq') as code`);
	const nextCode = codeResult?.[0]?.code;
	if (nextCode === undefined || nextCode === null) {
		throw new Error('Failed to generate user code from sequence user_code_seq');
	}
	const userCode = `U${String(nextCode)}`;

	return {
		...userData,
		code: userCode,
		passwordHash: hashedPassword,
		temporaryPassword: tempPassword // Store plain text for display to admin
	};
}

/**
 * Get available role options based on current user's role
 * @param currentUserRole Current user's role
 * @returns {Array<{value: string, label: string}>} Available role options
 */
export function getAvailableRoleOptions(currentUserRole: string): Array<{value: string, label: string}> {
	const roleHierarchy = {
		'national_admin': [
			{ value: 'national_admin', label: 'National Admin' },
			{ value: 'partner_manager', label: 'Partner Manager' },
			{ value: 'data_manager', label: 'Data Manager' },
			{ value: 'team_member', label: 'Team Member' }
		],
		'partner_manager': [
			{ value: 'team_member', label: 'Team Member' }
		],
		'data_manager': [],
		'team_member': []
	};

	return roleHierarchy[currentUserRole as keyof typeof roleHierarchy] || [];
}

/**
 * Validate if current user can create target role
 * @param currentUserRole Current user's role
 * @param targetRole Role to create
 * @returns {boolean} Whether creation is allowed
 */
export function canCreateRole(currentUserRole: string, targetRole: string): boolean {
	const allowedRoles = {
		'national_admin': ['national_admin', 'partner_manager', 'data_manager', 'team_member'],
		'partner_manager': ['team_member'],
		'data_manager': [],
		'team_member': []
	};

	return allowedRoles[currentUserRole as keyof typeof allowedRoles]?.includes(targetRole) || false;
}

/**
 * Format date from dd/mm/yyyy to yyyy-mm-dd for database
 * @param dateString Date string in dd/mm/yyyy format
 * @returns {string|null} Date string in yyyy-mm-dd format or null
 */
export function formatDateForDB(dateString: string): string | null {
	if (!dateString) return null;
	
	const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
	const match = dateString.match(regex);
	
	if (!match) return null;
	
	const [, day, month, year] = match;
	return `${year}-${month}-${day}`;
}

/**
 * Format date from yyyy-mm-dd to dd/mm/yyyy for display
 * @param dateString Date string in yyyy-mm-dd format
 * @returns {string|null} Date string in dd/mm/yyyy format or null
 */
export function formatDateForDisplay(dateString: string): string | null {
	if (!dateString) return null;
	
	const date = new Date(dateString);
	if (isNaN(date.getTime())) return null;
	
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const year = date.getFullYear();
	
	return `${day}/${month}/${year}`;
}
