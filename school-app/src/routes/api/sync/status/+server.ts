import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { surveyResponses } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireDeviceAuth } from '$lib/server/device-token';
import { logAudit } from '$lib/server/audit';

interface SyncStatusRequest {
    surveyIds?: string[];
}

interface SyncStatusResponse {
    success: boolean;
    totalPending?: number;
    lastSyncTime?: string;
    pendingSurveys?: Array<{
        localId: string;
        surveyUniqueId: string;
        lastAttempt: string;
        attempts: number;
    }>;
    error?: string;
}

export const GET = async (event: RequestEvent): Promise<Response> => {
    try {
        // Verify device authentication
        const deviceAuth = await requireDeviceAuth(event);

        // Get pending surveys for this user (partner-scoped)
        const pendingSurveys = await db.select({
            id: surveyResponses.id,
            surveyUniqueId: surveyResponses.surveyUniqueId,
            submittedAt: surveyResponses.submittedAt
        })
            .from(surveyResponses)
            .where(eq(surveyResponses.submittedBy, deviceAuth.userId));

        // Format pending surveys
        const formattedPending = pendingSurveys.map(survey => ({
            localId: survey.id,
            surveyUniqueId: survey.surveyUniqueId,
            lastAttempt: survey.submittedAt.toISOString(),
            attempts: 1 // This would be tracked in a separate sync_attempts table in production
        }));

        return json({
            success: true,
            totalPending: pendingSurveys.length,
            lastSyncTime: deviceAuth.lastUsed.toISOString(), // Use last device auth time as proxy
            pendingSurveys: formattedPending
        } as SyncStatusResponse);

    } catch (err: any) {
        console.error('Error getting sync status:', err);

        // Log error
        await logAudit({
            action: 'sync_status_error',
            entityType: 'sync_operation',
            userId: err.userId || null,
            newData: {
                error: err.message,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: err.message || 'Failed to get sync status'
        } as SyncStatusResponse, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};

export const POST = async (event: RequestEvent): Promise<Response> => {
    try {
        // Verify device authentication
        const deviceAuth = await requireDeviceAuth(event);

        const body: SyncStatusRequest = await event.json();
        const { surveyIds } = body;

        if (!surveyIds || !Array.isArray(surveyIds)) {
            return json({
                success: false,
                error: 'Survey IDs array is required'
            } as SyncStatusResponse, { status: 400 });
        }

        // Check status of specific surveys
        const existingSurveys = await db.select({
            id: surveyResponses.id,
            surveyUniqueId: surveyResponses.surveyUniqueId,
            submittedAt: surveyResponses.submittedAt
        })
            .from(surveyResponses)
            .where(inArray(surveyResponses.surveyUniqueId, surveyIds));

        const statusMap: Record<string, any> = {};

        // Build status map for requested surveys
        surveyIds.forEach(surveyId => {
            const existing = existingSurveys.find(s => s.surveyUniqueId === surveyId);
            if (existing) {
                statusMap[surveyId] = {
                    status: 'synced',
                    serverId: existing.id,
                    timestamp: existing.submittedAt.toISOString()
                };
            } else {
                statusMap[surveyId] = {
                    status: 'pending',
                    serverId: null,
                    timestamp: null
                };
            }
        });

        // Log sync status check
        await logAudit({
            action: 'sync_status_checked',
            entityType: 'sync_operation',
            userId: deviceAuth.userId,
            newData: {
                surveyIdsChecked: surveyIds.length,
                syncStatus: statusMap,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: true,
            statuses: statusMap
        });

    } catch (err: any) {
        console.error('Error checking sync status:', err);

        // Log error
        await logAudit({
            action: 'sync_status_check_error',
            entityType: 'sync_operation',
            userId: err.userId || null,
            newData: {
                error: err.message,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: err.message || 'Failed to check sync status'
        }, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};