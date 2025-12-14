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

/**
 * Sensitive fields that should never be logged in plain text
 */
const SENSITIVE_FIELDS = new Set([
	'temporaryPassword',
	'password',
	'passwordHash',
	'token',
	'apiKey',
	'secret'
]);

/**
 * Redact sensitive fields from audit data
 */
function redactSensitiveData(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
	if (!data) return data;

	const redacted = { ...data };
	for (const field of SENSITIVE_FIELDS) {
		if (field in redacted) {
			redacted[field] = '[REDACTED]';
		}
	}
	return redacted;
}

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

		// Redact sensitive data before logging
		const redactedOldData = redactSensitiveData(oldData);
		const redactedNewData = redactSensitiveData(newData);
		const redactedChanges = changes ? redactSensitiveData(changes) : undefined;

		const payload = redactedChanges
			? redactedChanges
			: redactedOldData || redactedNewData
				? { oldData: redactedOldData ?? null, newData: redactedNewData ?? null }
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
