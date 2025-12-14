import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deviceTokens } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireDeviceAuth } from '$lib/server/device-token';
import { logAudit } from '$lib/server/audit';

export const GET = async (event: RequestEvent): Promise<Response> => {
    try {
        // Verify device authentication
        const deviceAuth = await requireDeviceAuth(event);

        // Get all device tokens for this user
        const tokens = await db.select()
            .from(deviceTokens)
            .where(eq(deviceTokens.userId, deviceAuth.userId))
            .orderBy(desc(deviceTokens.lastUsed));

        // Format response
        const formattedTokens = tokens.map(token => ({
            id: token.id,
            deviceId: token.deviceId,
            deviceInfo: token.deviceInfo,
            createdAt: token.createdAt.toISOString(),
            lastUsed: token.lastUsed.toISOString(),
            expiresAt: token.expiresAt.toISOString(),
            isRevoked: token.isRevoked,
            ipAddress: token.ipAddress,
            isCurrent: token.id === deviceAuth.id // Mark current token
        }));

        return json({
            success: true,
            tokens: formattedTokens
        });

    } catch (err: any) {
        console.error('Error getting device tokens:', err);

        // Log error
        await logAudit({
            action: 'device_tokens_list_error',
            entityType: 'device_token',
            newData: {
                error: err.message,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: err.message || 'Failed to retrieve device tokens'
        }, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};

export const DELETE = async (event: RequestEvent): Promise<Response> => {
    try {
        // Verify device authentication
        const deviceAuth = await requireDeviceAuth(event);

        // Revoke all device tokens for this user except current one
        await db.update(deviceTokens)
            .set({
                isRevoked: true,
                revokedAt: new Date(),
                revokedBy: deviceAuth.userId,
                updatedAt: new Date()
            })
            .where(eq(deviceTokens.userId, deviceAuth.userId));

        // Log bulk revocation
        await logAudit({
            action: 'all_device_tokens_revoked',
            entityType: 'device_token',
            userId: deviceAuth.userId,
            newData: {
                exceptCurrentToken: deviceAuth.id,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: true,
            message: 'All device tokens revoked successfully'
        });

    } catch (err: any) {
        console.error('Error revoking device tokens:', err);

        // Log error
        await logAudit({
            action: 'device_tokens_revoke_all_error',
            entityType: 'device_token',
            newData: {
                error: err.message,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: err.message || 'Failed to revoke device tokens'
        }, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};