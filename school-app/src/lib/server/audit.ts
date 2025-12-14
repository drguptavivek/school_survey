import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';
import type { RequestEvent } from '@sveltejs/kit';
import crypto from 'crypto';

type AuditParams = {
	event?: RequestEvent;
	userId?: string | null;
	action: string;
	entityType: string;
	entityId?: string | null;
	changes?: Record<string, unknown>;
	oldData?: Record<string, unknown> | null;
	newData?: Record<string, unknown> | null;
	metadata?: Record<string, unknown>;
	severity?: 'low' | 'medium' | 'high' | 'critical';
	category?: 'security' | 'data' | 'system' | 'user' | 'sync';
};

/**
 * Sensitive fields that should never be logged in plain text
 */
const SENSITIVE_FIELDS = new Set([
	'temporaryPassword',
	'password',
	'passwordHash',
	'token',
	'deviceToken',
	'refreshToken',
	'apiKey',
	'secret',
	'accessToken',
	'encryptedData',
	'encryptionKey',
	'pinHash',
	'phoneNumber',
	'phoneNumber',
	'studentName',
	'email',
	'contactPhone',
	'personalInfo'
]);

/**
 * PII fields that should be partially masked
 */
const PII_FIELDS = new Set([
	'studentName',
	'phoneNumber',
	'contactPhone',
	'email',
	'ipAddress'
]);

/**
 * Security events that should be flagged for immediate review
 */
const SECURITY_EVENTS = new Set([
	'login_failed',
	'login_error',
	'token_verification_failed',
	'device_token_expired',
	'survey_duplicate_submission',
	'survey_submission_unauthorized',
	'bulk_sync_form_error',
	'unauthorized_access_attempt',
	'suspicious_activity',
	'data_breach_attempt',
	'privilege_escalation',
	'authentication_bypass'
]);

/**
 * Redact sensitive fields from audit data
 */
function redactSensitiveData(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
	if (!data) return data;

	const redacted = { ...data };

	// Complete redaction for highly sensitive fields
	for (const field of SENSITIVE_FIELDS) {
		if (field in redacted) {
			redacted[field] = '[REDACTED]';
		}
	}

	// Partial masking for PII fields
	for (const field of PII_FIELDS) {
		if (field in redacted && redacted[field]) {
			const value = String(redacted[field]);
			if (field === 'email') {
				const [username, domain] = value.split('@');
				redacted[field] = `${username.slice(0, 2)}***@${domain}`;
			} else if (field === 'phoneNumber' || field === 'contactPhone') {
				redacted[field] = value.slice(0, 3) + '***' + value.slice(-2);
			} else if (field === 'studentName') {
				redacted[field] = value.slice(0, 1) + '***';
			} else if (field === 'ipAddress') {
				// Keep first two octets for security monitoring
				const parts = value.split('.');
				if (parts.length === 4) {
					redacted[field] = `${parts[0]}.${parts[1]}.*.*`;
				}
			}
		}
	}

	return redacted;
}

/**
 * Generate audit entry hash for integrity verification
 */
function generateAuditHash(data: string): string {
	return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check if action is a security event
 */
function isSecurityEvent(action: string): boolean {
	return SECURITY_EVENTS.has(action) || action.includes('failed') || action.includes('error') || action.includes('unauthorized');
}

/**
 * Enhanced audit logging with security monitoring
 */
export async function logAudit({
	event,
	userId,
	action,
	entityType,
	entityId,
	changes,
	oldData,
	newData,
	metadata,
	severity = 'medium',
	category = 'user'
}: AuditParams) {
	try {
		const ipAddress = event?.getClientAddress ? event.getClientAddress() : undefined;
		const userAgent = event?.request?.headers.get('user-agent') || undefined;

		// Auto-detect security events and adjust severity
		const isSecurity = isSecurityEvent(action);
		const finalSeverity = isSecurity ? 'high' : severity;
		const finalCategory = isSecurity ? 'security' : category;

		// Redact sensitive data before logging
		const redactedOldData = redactSensitiveData(oldData);
		const redactedNewData = redactSensitiveData(newData);
		const redactedChanges = changes ? redactSensitiveData(changes) : undefined;
		const redactedMetadata = metadata ? redactSensitiveData(metadata) : undefined;

		// Build audit payload
		const auditPayload = {
			action,
			entityType,
			entityId: entityId ?? null,
			oldData: redactedOldData ?? null,
			newData: redactedNewData ?? null,
			changes: redactedChanges ?? null,
			metadata: redactedMetadata ?? null,
			timestamp: new Date().toISOString(),
			severity: finalSeverity,
			category: finalCategory,
			isSecurityEvent: isSecurity
		};

		// Generate integrity hash
		const payloadString = JSON.stringify(auditPayload);
		const auditHash = generateAuditHash(payloadString);

		await db.insert(auditLogs).values({
			userId: userId ?? null,
			action,
			entityType,
			entityId: entityId ?? null,
			changes: payloadString,
			ipAddress,
			createdAt: new Date()
		});

		// Log to console for security events (in production, this should go to a security monitoring system)
		if (isSecurity) {
			console.warn(`[SECURITY_AUDIT] ${action.toUpperCase()}`, {
				userId,
				entityType,
				entityId,
				ipAddress,
				userAgent,
				timestamp: new Date().toISOString(),
				hash: auditHash
			});
		}

		// Optional: Send to external security monitoring system
		if (isSecurity && process.env.SECURITY_WEBHOOK_URL) {
			try {
				await fetch(process.env.SECURITY_WEBHOOK_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN}`
					},
					body: JSON.stringify({
						eventType: 'security_audit',
						action,
						severity: finalSeverity,
						userId,
						entityType,
						entityId,
						ipAddress,
						userAgent,
						timestamp: new Date().toISOString(),
						hash: auditHash,
						details: auditPayload
					})
				});
			} catch (webhookErr) {
				console.error('[AUDIT] Failed to send security webhook:', webhookErr);
			}
		}

	} catch (err) {
		console.error('[AUDIT] Failed to write audit log:', err);
		// In production, this should trigger an alert to the security team
	}
}

/**
 * Bulk audit logging for operations affecting multiple records
 */
export async function logBulkAudit({
	event,
	userId,
	action,
	entityType,
	entityIds,
	metadata,
	severity = 'medium',
	category = 'data'
}: {
	event?: RequestEvent;
	userId?: string | null;
	action: string;
	entityType: string;
	entityIds: string[];
	metadata?: Record<string, unknown>;
	severity?: 'low' | 'medium' | 'high' | 'critical';
	category?: 'security' | 'data' | 'system' | 'user' | 'sync';
}) {
	for (const entityId of entityIds) {
		await logAudit({
			event,
			userId,
			action,
			entityType,
			entityId,
			metadata: {
				...metadata,
				bulkOperation: true,
				totalRecords: entityIds.length
			},
			severity,
			category
		});
	}
}

/**
 * Specialized logging for sync operations
 */
export async function logSyncOperation({
	event,
	userId,
	operation,
	deviceId,
	surveyCount,
	successCount,
	failureCount,
	errors,
	metadata
}: {
	event?: RequestEvent;
	userId?: string | null;
	operation: 'upload' | 'download' | 'status_check' | 'sync_completed' | 'sync_failed';
	deviceId: string;
	surveyCount: number;
	successCount: number;
	failureCount: number;
	errors?: string[];
	metadata?: Record<string, unknown>;
}) {
	await logAudit({
		event,
		userId,
		action: `sync_${operation}`,
		entityType: 'sync_operation',
		metadata: {
			deviceId,
			surveyCount,
			successCount,
			failureCount,
			errors: errors || [],
			successRate: surveyCount > 0 ? (successCount / surveyCount * 100).toFixed(2) + '%' : '0%',
			...metadata
		},
		severity: failureCount > 0 ? 'high' : 'medium',
		category: 'sync'
	});
}

/**
 * Specialized logging for authentication events
 */
export async function logAuthEvent({
	event,
	userId,
	eventType,
	email,
	deviceId,
	success,
	reason,
	metadata
}: {
	event?: RequestEvent;
	userId?: string | null;
	eventType: 'login' | 'logout' | 'token_verification' | 'token_issue' | 'token_revoke';
	email?: string;
	deviceId?: string;
	success: boolean;
	reason?: string;
	metadata?: Record<string, unknown>;
}) {
	const action = success ? `auth_${eventType}_success` : `auth_${eventType}_failed`;

	await logAudit({
		event,
		userId,
		action,
		entityType: 'authentication',
		metadata: {
			eventType,
			email: email ? email.slice(0, 2) + '***@***' : undefined,
			deviceId,
			success,
			reason,
			...metadata
		},
		severity: success ? 'low' : 'high',
		category: 'security'
	});
}

/**
 * Specialized logging for data access events
 */
export async function logDataAccess({
	event,
	userId,
	entityType,
	entityId,
	accessType,
	scope,
	metadata
}: {
	event?: RequestEvent;
	userId?: string | null;
	entityType: string;
	entityId?: string;
	accessType: 'read' | 'write' | 'delete' | 'export';
	scope: 'own' | 'partner' | 'all';
	metadata?: Record<string, unknown>;
}) {
	await logAudit({
		event,
		userId,
		action: `data_access_${accessType}`,
		entityType,
		entityId,
		metadata: {
			accessType,
			scope,
			...metadata
		},
		severity: accessType === 'delete' || accessType === 'export' ? 'high' : 'low',
		category: 'data'
	});
}
