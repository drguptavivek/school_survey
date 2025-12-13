import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';
import type { RequestEvent } from '@sveltejs/kit';

type AuditParams = {
	event?: RequestEvent;
	userId?: string | null;
	action: string;
	entityType: string;
	entityId?: string | null;
	changes?: Record<string, unknown>;
	oldData?: Record<string, unknown> | null;
	newData?: Record<string, unknown> | null;
};

export async function logAudit({
	event,
	userId,
	action,
	entityType,
	entityId,
	changes,
	oldData,
	newData
}: AuditParams) {
	try {
		const ipAddress = event?.getClientAddress ? event.getClientAddress() : undefined;
		const payload = changes
			? changes
			: oldData || newData
				? { oldData: oldData ?? null, newData: newData ?? null }
				: undefined;

		await db.insert(auditLogs).values({
			userId: userId ?? null,
			action,
			entityType,
			entityId: entityId ?? null,
			changes: payload ? JSON.stringify(payload) : null,
			ipAddress,
			createdAt: new Date(),
			// userAgent is not in schema; omit
		});
	} catch (err) {
		console.error('[AUDIT] Failed to write audit log', err);
	}
}
