import bcrypt from 'bcrypt';
import { db } from './db';
import { sessions, users } from './db/schema';
import { eq, gt, ilike, or } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const { hash, compare } = bcrypt;

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const HASH_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	return hash(password, HASH_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
	return compare(password, passwordHash);
}

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(
	userId: string,
	ipAddress?: string,
	userAgent?: string
): Promise<string> {
	const token = generateSessionToken();
	const expiresAt = new Date(Date.now() + SESSION_DURATION);

	await db.insert(sessions).values({
		userId,
		token,
		expiresAt,
		ipAddress,
		userAgent
	});

	return token;
}

/**
 * Validate a session token and return user data if valid
 */
export async function validateSession(token: string) {
	const [session] = await db
		.select()
		.from(sessions)
		.where(eq(sessions.token, token))
		.limit(1);

	if (!session) {
		return null;
	}

	// Check if session has expired
	if (new Date(session.expiresAt) < new Date()) {
		// Delete expired session
		await db.delete(sessions).where(eq(sessions.token, token));
		return null;
	}

	// Get user data
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, session.userId))
		.limit(1);

	if (!user || !user.isActive) {
		return null;
	}

	return {
		session,
		user
	};
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.token, token));
}

/**
 * Delete all sessions for a user (logout all devices)
 */
export async function deleteUserSessions(userId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
	const result = await db
		.delete(sessions)
		.where(gt(sessions.expiresAt, new Date()))
		.returning();

	return result.length;
}

/**
 * Authenticate user with email OR user code and password
 */
export async function authenticateUser(identifier: string, password: string) {
	const trimmed = identifier.trim();
	const isEmail = trimmed.includes('@');
	const email = isEmail ? trimmed.toLowerCase() : null;
	const code = !isEmail ? trimmed.toUpperCase() : null;
	const codeAlt = code
		? code.startsWith('U')
			? code.slice(1)
			: `U${code}`
		: null;

	const codeConditions = !isEmail
		? [
				ilike(users.code, code!),
				...(codeAlt ? [ilike(users.code, codeAlt)] : [])
			]
		: [];

	const [user] = await db
		.select()
		.from(users)
		.where(isEmail ? eq(users.email, email!) : or(...codeConditions))
		.limit(1);

	if (!user || !user.isActive) {
		return null;
	}

	const passwordValid = await verifyPassword(password, user.passwordHash);
	if (!passwordValid) {
		return null;
	}

	// Update last login
	await db
		.update(users)
		.set({ lastLoginAt: new Date() })
		.where(eq(users.id, user.id));

	return user;
}
