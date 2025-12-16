import { db } from './db';
import { deviceTokens, users } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from './audit';
import type { RequestEvent } from '@sveltejs/kit';
import crypto from 'crypto';

export interface DeviceTokenUser {
    id: string;
    email: string;
    role: string;
    partnerId: string | null;
    name: string;
}

export interface DeviceTokenInfo {
    id: string;
    userId: string;
    deviceId: string;
    token: string;
    deviceInfo: string | null;
    expiresAt: Date;
    isRevoked: boolean;
    lastUsed: Date;
    user: DeviceTokenUser;
}

/**
 * Verify device token from Authorization header and return user information
 */
export async function requireDeviceAuth(event: RequestEvent): Promise<DeviceTokenInfo> {
    const token = event.request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
        throw new Error('No authorization token provided');
    }

    const deviceToken = await verifyDeviceToken(token, event);
    if (!deviceToken) {
        throw new Error('Invalid or expired device token');
    }

    return deviceToken;
}

/**
 * Verify device token and update last used timestamp
 */
export async function verifyDeviceToken(token: string, event?: RequestEvent): Promise<DeviceTokenInfo | null> {
    try {
        const payload = decodeAndVerifyToken(token, event);
        if (!payload) return null;

        // Get token and user from database
        const result = await db.select({
            deviceToken: deviceTokens,
            user: users
        })
            .from(deviceTokens)
            .innerJoin(users, eq(deviceTokens.userId, users.id))
            .where(and(
                eq(deviceTokens.token, token),
                eq(deviceTokens.deviceId, payload.deviceId),
                eq(deviceTokens.userId, payload.userId),
                eq(users.isActive, true)
            ))
            .limit(1);

        if (!result[0]) {
            if (event) {
                await logInvalidTokenAttempt(token, event, 'token_not_found_or_inactive_user');
            }
            return null;
        }

        const { deviceToken, user } = result[0];

        // Check if token is expired
        if (deviceToken.expiresAt < new Date()) {
            // Auto-revoke expired token
            await db.update(deviceTokens)
                .set({
                    isRevoked: true,
                    revokedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(deviceTokens.id, deviceToken.id));

            if (event) {
                await logTokenExpired(deviceToken, event);
            }
            return null;
        }

        // Check if token is revoked
        if (deviceToken.isRevoked) {
            if (event) {
                await logInvalidTokenAttempt(token, event, 'token_revoked');
            }
            return null;
        }

        // Update last used timestamp
        await db.update(deviceTokens)
            .set({
                lastUsed: new Date(),
                updatedAt: new Date(),
                ipAddress: event ? event.getClientAddress() : undefined,
                userAgent: event ? event.request.headers.get('user-agent') : undefined
            })
            .where(eq(deviceTokens.id, deviceToken.id));

        return {
            id: deviceToken.id,
            userId: deviceToken.userId,
            deviceId: deviceToken.deviceId,
            token: deviceToken.token,
            deviceInfo: deviceToken.deviceInfo,
            expiresAt: deviceToken.expiresAt,
            isRevoked: deviceToken.isRevoked,
            lastUsed: deviceToken.lastUsed,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                partnerId: user.partnerId,
                name: user.name
            }
        };

    } catch (err) {
        console.error('Device token verification error:', err);
        if (event) {
            await logSystemError(err, event);
        }
        return null;
    }
}

/**
 * Decode and verify token signature. Returns payload or null.
 */
function decodeAndVerifyToken(token: string, event?: RequestEvent): { userId: string; deviceId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
        if (event) {
            logInvalidTokenAttempt(token, event, 'invalid_token_format');
        }
        return null;
    }

    const [headerB64, payloadB64, signature] = parts;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    const expectedSignature = crypto
        .createHmac('sha256', process.env.DEVICE_TOKEN_SECRET || 'default-secret')
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

    if (signature !== expectedSignature) {
        if (event) {
            logInvalidTokenAttempt(token, event, 'invalid_signature');
        }
        return null;
    }

    return payload;
}

/**
 * Look up a device token purely by the token string (signature-verified).
 * Used for logout/revoke flows even if token is expired.
 */
export async function findDeviceTokenByRawToken(token: string): Promise<{
    record: typeof deviceTokens.$inferSelect;
    user: typeof users.$inferSelect;
} | null> {
    const payload = decodeAndVerifyToken(token);
    if (!payload) return null;

    const result = await db
        .select({
            deviceToken: deviceTokens,
            user: users
        })
        .from(deviceTokens)
        .innerJoin(users, eq(deviceTokens.userId, users.id))
        .where(
            and(
                eq(deviceTokens.token, token),
                eq(deviceTokens.deviceId, payload.deviceId),
                eq(deviceTokens.userId, payload.userId)
            )
        )
        .limit(1);

    if (!result[0]) {
        return null;
    }

    return { record: result[0].deviceToken, user: result[0].user };
}

/**
 * Generate a new device token
 */
export function generateDeviceToken(userId: string, deviceId: string): string {
    const payload = {
        userId,
        deviceId,
        type: 'device_token',
        timestamp: Date.now(),
        random: crypto.randomBytes(16).toString('hex')
    };

    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    // In production, use a proper JWT library
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', process.env.DEVICE_TOKEN_SECRET || 'default-secret')
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Revoke a device token
 */
export async function revokeDeviceToken(tokenId: string, revokedBy: string): Promise<boolean> {
    try {
        await db.update(deviceTokens)
            .set({
                isRevoked: true,
                revokedAt: new Date(),
                revokedBy,
                updatedAt: new Date()
            })
            .where(eq(deviceTokens.id, tokenId));

        return true;
    } catch (err) {
        console.error('Error revoking device token:', err);
        return false;
    }
}

/**
 * Get all device tokens for a user
 */
export async function getUserDeviceTokens(userId: string): Promise<DeviceTokenInfo[]> {
    try {
        const result = await db.select({
            deviceToken: deviceTokens,
            user: users
        })
            .from(deviceTokens)
            .innerJoin(users, eq(deviceTokens.userId, users.id))
            .where(eq(deviceTokens.userId, userId));

        return result.map(({ deviceToken, user }) => ({
            id: deviceToken.id,
            userId: deviceToken.userId,
            deviceId: deviceToken.deviceId,
            token: deviceToken.token,
            deviceInfo: deviceToken.deviceInfo,
            expiresAt: deviceToken.expiresAt,
            isRevoked: deviceToken.isRevoked,
            lastUsed: deviceToken.lastUsed,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                partnerId: user.partnerId,
                name: user.name
            }
        }));
    } catch (err) {
        console.error('Error getting user device tokens:', err);
        return [];
    }
}

// Logging helpers
async function logInvalidTokenAttempt(token: string, event: RequestEvent, reason: string) {
    await logAudit({
        action: 'token_verification_failed',
        entityType: 'device_token',
        newData: {
            tokenPrefix: token.substring(0, 10) + '...',
            reason,
            ipAddress: event.getClientAddress(),
            userAgent: event.request.headers.get('user-agent')
        }
    });
}

async function logTokenExpired(deviceToken: typeof deviceTokens.$inferSelect, event: RequestEvent) {
    await logAudit({
        action: 'device_token_expired',
        entityType: 'device_token',
        entityId: deviceToken.id,
        userId: deviceToken.userId,
        newData: {
            device_id: deviceToken.deviceId,
            reason: 'Token expired during verification',
            ipAddress: event.getClientAddress(),
            userAgent: event.request.headers.get('user-agent')
        }
    });
}

async function logSystemError(err: unknown, event: RequestEvent) {
    await logAudit({
        action: 'token_verification_error',
        entityType: 'system',
        newData: {
            error: err instanceof Error ? err.message : 'Unknown error',
            ipAddress: event.getClientAddress(),
            userAgent: event.request.headers.get('user-agent')
        }
    });
}
