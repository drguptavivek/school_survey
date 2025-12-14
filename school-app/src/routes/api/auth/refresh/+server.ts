import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deviceTokens } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from '$lib/server/audit';
import crypto from 'crypto';

interface RefreshTokenRequest {
    refreshToken: string;
    deviceId: string;
}

interface RefreshTokenResponse {
    success: boolean;
    deviceToken?: string;
    expiresAt?: string;
    error?: string;
}

export const POST = async ({ request, getClientAddress }: RequestEvent): Promise<Response> => {
    try {
        const body: RefreshTokenRequest = await request.json();

        // Validate required fields
        const { refreshToken, deviceId } = body;

        if (!refreshToken || !deviceId) {
            return json({
                success: false,
                error: 'Missing required fields: refreshToken, deviceId'
            } as RefreshTokenResponse, { status: 400 });
        }

        // In a real implementation, you would validate the refresh token
        // For now, we'll create a new device token (assuming refresh token is valid)

        // This is a simplified implementation
        // In production, you would have a separate refresh_tokens table or include refresh logic in device tokens

        // For this demo, we'll treat the refresh token as a user identifier
        // In practice, this should be more secure
        const parts = refreshToken.split(':');
        if (parts.length !== 2) {
            return json({
                success: false,
                error: 'Invalid refresh token'
            } as RefreshTokenResponse, { status: 401 });
        }

        const userId = parts[0];
        const timestamp = parseInt(parts[1]);

        // Check if refresh token is too old (30 days)
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (Date.now() - timestamp > maxAge) {
            return json({
                success: false,
                error: 'Refresh token expired'
            } as RefreshTokenResponse, { status: 401 });
        }

        // Find existing device token for this device
        const existingToken = await db.select()
            .from(deviceTokens)
            .where(and(
                eq(deviceTokens.userId, userId),
                eq(deviceTokens.deviceId, deviceId),
                eq(deviceTokens.isRevoked, false)
            ))
            .limit(1);

        if (!existingToken[0]) {
            return json({
                success: false,
                error: 'No valid device token found for refresh'
            } as RefreshTokenResponse, { status: 401 });
        }

        // Generate new device token
        const newDeviceToken = generateDeviceToken(userId, deviceId);
        const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year

        // Update existing token
        const updated = await db.update(deviceTokens)
            .set({
                token: newDeviceToken,
                expiresAt,
                lastUsed: new Date(),
                updatedAt: new Date(),
                ipAddress: getClientAddress(),
                userAgent: request.headers.get('user-agent')
            })
            .where(eq(deviceTokens.id, existingToken[0].id))
            .returning();

        // Log token refresh
        await logAudit({
            action: 'device_token_refreshed',
            entityType: 'device_token',
            entityId: updated[0].id,
            userId: userId,
            newData: {
                device_id: deviceId,
                expires_at: expiresAt.toISOString(),
                ip_address: getClientAddress(),
                user_agent: request.headers.get('user-agent')
            }
        });

        return json({
            success: true,
            deviceToken: newDeviceToken,
            expiresAt: expiresAt.toISOString()
        } as RefreshTokenResponse);

    } catch (err) {
        console.error('Token refresh error:', err);

        // Log system error
        await logAudit({
            action: 'token_refresh_error',
            entityType: 'system',
            newData: {
                error: err instanceof Error ? err.message : 'Unknown error',
                ipAddress: getClientAddress(),
                userAgent: request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: 'Internal server error'
        } as RefreshTokenResponse, { status: 500 });
    }
};

// Generate a secure device token
function generateDeviceToken(userId: string, deviceId: string): string {
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