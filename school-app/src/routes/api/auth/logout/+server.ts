import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { requireDeviceAuth, revokeDeviceToken } from '$lib/server/device-token';
import { logAudit } from '$lib/server/audit';

export const POST = async (event: RequestEvent): Promise<Response> => {
    try {
        const { deviceId } = await event.request.json().catch(() => ({ deviceId: undefined as string | undefined }));
        // Ensure the caller is an authenticated device
        const deviceAuth = await requireDeviceAuth(event);

        if (deviceId && deviceId !== deviceAuth.deviceId) {
            return json(
                { success: false, error: 'Device ID mismatch' },
                { status: 400 }
            );
        }

        // Revoke the current device token
        const success = await revokeDeviceToken(deviceAuth.id, deviceAuth.userId);
        if (!success) {
            return json(
                { success: false, error: 'Failed to revoke device token' },
                { status: 500 }
            );
        }

        // Audit trail
        await logAudit({
            action: 'device_logout',
            entityType: 'device_token',
            entityId: deviceAuth.id,
            userId: deviceAuth.userId,
            oldData: {
                device_id: deviceAuth.deviceId,
                device_info: deviceAuth.deviceInfo
            },
            newData: {
                is_revoked: true,
                revoked_at: new Date(),
                ip_address: event.getClientAddress(),
                user_agent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: true,
            message: 'Logged out and device token revoked'
        });
    } catch (err: any) {
        console.error('Logout error:', err);

        await logAudit({
            action: 'device_logout_error',
            entityType: 'device_token',
            newData: {
                error: err?.message || 'Unknown error',
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json(
            { success: false, error: err?.message || 'Failed to logout device' },
            { status: err?.message === 'No authorization token provided' ? 401 : 500 }
        );
    }
};
