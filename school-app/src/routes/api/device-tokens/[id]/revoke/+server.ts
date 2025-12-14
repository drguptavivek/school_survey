import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deviceTokens } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireDeviceAuth, revokeDeviceToken } from '$lib/server/device-token';
import { logAudit } from '$lib/server/audit';

export const POST = async ({ params, getClientAddress, request }: RequestEvent & { params: { id: string } }): Promise<Response> => {
    try {
        const tokenId = params.id;

        if (!tokenId) {
            return json({
                success: false,
                error: 'Token ID is required'
            }, { status: 400 });
        }

        // Verify device authentication
        const deviceAuth = await requireDeviceAuth({ request, getClientAddress } as RequestEvent);

        // Prevent revoking the currently used token
        if (tokenId === deviceAuth.id) {
            return json({
                success: false,
                error: 'Cannot revoke the currently used device token'
            }, { status: 400 });
        }

        // Check if the token belongs to the current user
        const tokenToRevoke = await db.select()
            .from(deviceTokens)
            .where(and(
                eq(deviceTokens.id, tokenId),
                eq(deviceTokens.userId, deviceAuth.userId)
            ))
            .limit(1);

        if (!tokenToRevoke[0]) {
            return json({
                success: false,
                error: 'Device token not found'
            }, { status: 404 });
        }

        // Check if token is already revoked
        if (tokenToRevoke[0].isRevoked) {
            return json({
                success: false,
                error: 'Device token is already revoked'
            }, { status: 400 });
        }

        // Revoke the token
        const success = await revokeDeviceToken(tokenId, deviceAuth.userId);

        if (!success) {
            return json({
                success: false,
                error: 'Failed to revoke device token'
            }, { status: 500 });
        }

        // Log successful revocation
        await logAudit({
            action: 'device_token_revoked',
            entityType: 'device_token',
            entityId: tokenId,
            userId: deviceAuth.userId,
            oldData: {
                device_id: tokenToRevoke[0].deviceId,
                device_info: tokenToRevoke[0].deviceInfo,
                last_used: tokenToRevoke[0].lastUsed
            },
            newData: {
                is_revoked: true,
                revoked_at: new Date(),
                revoked_by: deviceAuth.userId,
                ip_address: getClientAddress(),
                user_agent: request.headers.get('user-agent')
            }
        });

        return json({
            success: true,
            message: 'Device token revoked successfully'
        });

    } catch (err: any) {
        console.error('Error revoking device token:', err);

        // Log error
        await logAudit({
            action: 'device_token_revoke_error',
            entityType: 'device_token',
            entityId: params.id,
            newData: {
                error: err.message,
                ipAddress: getClientAddress(),
                userAgent: request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: err.message || 'Failed to revoke device token'
        }, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};