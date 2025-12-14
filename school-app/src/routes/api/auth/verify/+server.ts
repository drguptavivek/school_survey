import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deviceTokens, users } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { logAudit } from '$lib/server/audit';
import * as crypto from 'node:crypto';

interface VerifyResponse {
    valid: boolean;
    user?: {
        id: string;
        email: string;
        role: string;
        partnerId: string | null;
        name: string;
    };
    error?: string;
    requiresReauth?: boolean;
}

export const POST = async ({ request, getClientAddress }: RequestEvent): Promise<Response> => {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return json({
                valid: false,
                error: 'No token provided'
            } as VerifyResponse, { status: 401 });
        }

        // Verify device token and get user information
        const deviceToken = await verifyDeviceToken(token);
        if (!deviceToken) {
            // Log invalid token attempt
            await logAudit({
                action: 'token_verification_failed',
                entityType: 'device_token',
                newData: {
                    tokenPrefix: token.substring(0, 10) + '...',
                    ipAddress: getClientAddress(),
                    userAgent: request.headers.get('user-agent'),
                    reason: 'invalid_token_format'
                }
            });

            return json({
                valid: false,
                error: 'Invalid token'
            } as VerifyResponse, { status: 401 });
        }

        // Check if token is expired
        if (deviceToken.expiresAt < new Date()) {
            await logAudit({
                action: 'device_token_expired',
                entityType: 'device_token',
                entityId: deviceToken.id,
                userId: deviceToken.userId,
                newData: {
                    device_id: deviceToken.deviceId,
                    reason: 'Token expired during verification',
                    ipAddress: getClientAddress(),
                    userAgent: request.headers.get('user-agent')
                }
            });

            // Revoke expired token
            await db.update(deviceTokens)
                .set({
                    isRevoked: true,
                    revokedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(deviceTokens.id, deviceToken.id));

            return json({
                valid: false,
                error: 'Token expired',
                requiresReauth: true
            } as VerifyResponse, { status: 401 });
        }

        // Check if token is revoked
        if (deviceToken.isRevoked) {
            await logAudit({
                action: 'token_verification_failed',
                entityType: 'device_token',
                entityId: deviceToken.id,
                userId: deviceToken.userId,
                newData: {
                    device_id: deviceToken.deviceId,
                    reason: 'Token already revoked',
                    ipAddress: getClientAddress(),
                    userAgent: request.headers.get('user-agent')
                }
            });

            return json({
                valid: false,
                error: 'Token revoked',
                requiresReauth: true
            } as VerifyResponse, { status: 401 });
        }

        // Check if user is still active
        const user = await db.select()
            .from(users)
            .where(and(
                eq(users.id, deviceToken.userId),
                eq(users.isActive, true)
            ))
            .limit(1);

        if (!user[0]) {
            await logAudit({
                action: 'token_verification_failed',
                entityType: 'device_token',
                entityId: deviceToken.id,
                userId: deviceToken.userId,
                newData: {
                    device_id: deviceToken.deviceId,
                    reason: 'User not found or inactive',
                    ipAddress: getClientAddress(),
                    userAgent: request.headers.get('user-agent')
                }
            });

            return json({
                valid: false,
                error: 'User not found or inactive',
                requiresReauth: true
            } as VerifyResponse, { status: 401 });
        }

        // Update last used timestamp
        await db.update(deviceTokens)
            .set({
                lastUsed: new Date(),
                updatedAt: new Date()
            })
            .where(eq(deviceTokens.id, deviceToken.id));

        // Token is valid, return user information
        return json({
            valid: true,
            user: {
                id: user[0].id,
                email: user[0].email,
                role: user[0].role,
                partnerId: user[0].partnerId,
                name: user[0].name
            }
        } as VerifyResponse);

    } catch (err) {
        console.error('Token verification error:', err);

        // Log system error
        await logAudit({
            action: 'token_verification_error',
            entityType: 'system',
            newData: {
                error: err instanceof Error ? err.message : 'Unknown error',
                ipAddress: getClientAddress(),
                userAgent: request.headers.get('user-agent')
            }
        });

        return json({
            valid: false,
            error: 'Internal server error'
        } as VerifyResponse, { status: 500 });
    }
};

// Verify device token format and signature
async function verifyDeviceToken(token: string): Promise<any> {
    try {
        // Simple token format validation (in production, use proper JWT library)
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [headerB64, payloadB64, signature] = parts;

        // Decode payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.DEVICE_TOKEN_SECRET || 'default-secret')
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64url');

        if (signature !== expectedSignature) {
            return null;
        }

        // Get token from database
        const deviceToken = await db.select()
            .from(deviceTokens)
            .where(and(
                eq(deviceTokens.token, token),
                eq(deviceTokens.deviceId, payload.deviceId),
                eq(deviceTokens.userId, payload.userId)
            ))
            .limit(1);

        return deviceToken[0] || null;

    } catch (err) {
        console.error('Device token verification error:', err);
        return null;
    }
}