import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deviceTokens } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireDeviceAuth, revokeDeviceToken, findDeviceTokenByRawToken } from '$lib/server/device-token';
import { logAudit } from '$lib/server/audit';

const isUuid = (value: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const POST = async ({ params, getClientAddress, request }: RequestEvent & { params: { id: string } }): Promise<Response> => {
    try {
        const tokenParam = params.id;
        const authHeaderToken = request.headers.get('authorization')?.replace('Bearer ', '') ?? undefined;

        if (!tokenParam) {
            return json({
                success: false,
                error: 'Token ID is required'
            }, { status: 400 });
        }

        // Try auth; if it fails (expired token) we still attempt best-effort revoke
        let deviceAuth: Awaited<ReturnType<typeof requireDeviceAuth>> | null = null;
        try {
            deviceAuth = await requireDeviceAuth({ request, getClientAddress } as RequestEvent);
        } catch {
            deviceAuth = null;
        }

        // Resolve token record by UUID or raw token (signature-verified)
        let tokenRecord: typeof deviceTokens.$inferSelect | null = null;
        if (isUuid(tokenParam)) {
            const byId = await db.select().from(deviceTokens).where(eq(deviceTokens.id, tokenParam)).limit(1);
            tokenRecord = byId[0] ?? null;
        } else {
            const found = await findDeviceTokenByRawToken(tokenParam);
            tokenRecord = found?.record ?? null;
        }

        if (!tokenRecord && authHeaderToken && authHeaderToken !== tokenParam) {
            const alt = await findDeviceTokenByRawToken(authHeaderToken);
            tokenRecord = alt?.record ?? null;
        }

        if (!tokenRecord) {
            return json({
                success: false,
                error: 'Device token not found'
            }, { status: 404 });
        }

        // Ensure the token belongs to the same user if auth was provided
        if (deviceAuth && deviceAuth.userId !== tokenRecord.userId) {
            return json({
                success: false,
                error: 'Token does not belong to this user'
            }, { status: 403 });
        }

        const tokenId = tokenRecord.id;

        // Check if token is already revoked
        if (tokenRecord.isRevoked) {
            return json({
                success: false,
                error: 'Device token is already revoked'
            }, { status: 400 });
        }

        // Revoke the token
        const revokedBy = deviceAuth?.userId ?? tokenRecord.userId;
        const success = await revokeDeviceToken(tokenId, revokedBy);

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
            userId: revokedBy,
            oldData: {
                device_id: tokenRecord.deviceId,
                device_info: tokenRecord.deviceInfo,
                last_used: tokenRecord.lastUsed
            },
            newData: {
                is_revoked: true,
                revoked_at: new Date(),
                revoked_by: revokedBy,
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
            entityId: isUuid(params.id) ? params.id : null,
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
