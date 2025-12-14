import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { surveyResponses, schools, districts } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireDeviceAuth } from '$lib/server/device-token';
import { logAudit } from '$lib/server/audit';
import { validateSurveyUniqueId } from '$lib/server/validation';
import crypto from 'crypto';

interface EncryptedSurveyDto {
    localId: string;
    encryptedData: string;
    checksum: string;
}

interface BulkSyncRequest {
    forms: EncryptedSurveyDto[];
    encryptionKey: string;
}

interface SyncResultDto {
    localId: string;
    success: boolean;
    surveyId?: string;
    timestamp?: string;
    ack?: string;
    error?: string;
    existingId?: string;
}

interface BulkSyncResponse {
    success: boolean;
    processed: number;
    results: SyncResultDto[];
    error?: string;
}

export const POST = async (event: RequestEvent): Promise<Response> => {
    try {
        // Verify device authentication
        const deviceAuth = await requireDeviceAuth(event);

        const bulkRequest: BulkSyncRequest = await event.request.json();

        // Validate request
        if (!bulkRequest.forms || !Array.isArray(bulkRequest.forms)) {
            return json({
                success: false,
                processed: 0,
                results: [],
                error: 'Forms array is required'
            } as BulkSyncResponse, { status: 400 });
        }

        if (!bulkRequest.encryptionKey) {
            return json({
                success: false,
                processed: 0,
                results: [],
                error: 'Encryption key is required'
            } as BulkSyncResponse, { status: 400 });
        }

        if (bulkRequest.forms.length > 100) {
            return json({
                success: false,
                processed: 0,
                results: [],
                error: 'Maximum 100 forms allowed per bulk sync request'
            } as BulkSyncResponse, { status: 400 });
        }

        const results: SyncResultDto[] = [];
        const now = new Date();

        // Process each encrypted form
        for (const encryptedForm of bulkRequest.forms) {
            try {
                // Validate checksum
                const calculatedChecksum = crypto
                    .createHash('sha256')
                    .update(encryptedForm.encryptedData + bulkRequest.encryptionKey)
                    .digest('hex');

                if (calculatedChecksum !== encryptedForm.checksum) {
                    results.push({
                        localId: encryptedForm.localId,
                        success: false,
                        error: 'Checksum verification failed - data may be corrupted'
                    });
                    continue;
                }

                // Decrypt form data (simplified for demo - in production, use proper encryption)
                let decryptedData;
                try {
                    // For demo purposes, we'll assume the data is not actually encrypted
                    // In production, you would decrypt using the encryption key
                    decryptedData = JSON.parse(encryptedForm.encryptedData);
                } catch (decryptErr) {
                    results.push({
                        localId: encryptedForm.localId,
                        success: false,
                        error: 'Failed to decrypt form data'
                    });
                    continue;
                }

                // Validate decrypted data structure
                if (!decryptedData.surveyUniqueId || !decryptedData.schoolId) {
                    results.push({
                        localId: encryptedForm.localId,
                        success: false,
                        error: 'Invalid form data structure'
                    });
                    continue;
                }

                // Validate survey unique ID format
                if (!validateSurveyUniqueId(decryptedData.surveyUniqueId)) {
                    results.push({
                        localId: encryptedForm.localId,
                        success: false,
                        error: 'Invalid survey unique ID format'
                    });
                    continue;
                }

                // Verify school access (partner scoping)
                const schoolAccess = await db.select({
                    school: schools,
                    district: districts
                })
                    .from(schools)
                    .innerJoin(districts, eq(schools.districtId, districts.id))
                    .where(and(
                        eq(schools.id, decryptedData.schoolId),
                        eq(districts.partnerId, deviceAuth.user.partnerId || '')
                    ))
                    .limit(1);

                if (!schoolAccess[0]) {
                    results.push({
                        localId: encryptedForm.localId,
                        success: false,
                        error: 'School access denied'
                    });
                    continue;
                }

                // Check for duplicate survey
                const existingSurvey = await db.select()
                    .from(surveyResponses)
                    .where(eq(surveyResponses.surveyUniqueId, decryptedData.surveyUniqueId))
                    .limit(1);

                if (existingSurvey[0]) {
                    results.push({
                        localId: encryptedForm.localId,
                        success: false,
                        error: 'Duplicate survey',
                        existingId: existingSurvey[0].id
                    });
                    continue;
                }

                // Calculate edit deadlines
                const teamEditDeadline = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
                const partnerEditDeadline = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 days

                // Insert survey
                const insertedSurvey = await db.insert(surveyResponses).values({
                    // Basic Details
                    surveyUniqueId: decryptedData.surveyUniqueId,
                    surveyDate: new Date(decryptedData.surveyDate),
                    districtId: decryptedData.districtId,
                    areaType: decryptedData.areaType,
                    schoolId: decryptedData.schoolId,
                    schoolType: decryptedData.schoolType,
                    class: decryptedData.class,
                    section: decryptedData.section,
                    rollNo: decryptedData.rollNo,
                    studentName: decryptedData.studentName?.trim() || '',
                    sex: decryptedData.sex,
                    age: decryptedData.age,
                    consent: decryptedData.consent,

                    // Distance Vision
                    usesDistanceGlasses: decryptedData.usesDistanceGlasses || false,
                    unaidedVaRightEye: decryptedData.unaidedVaRightEye || null,
                    unaidedVaLeftEye: decryptedData.unaidedVaLeftEye || null,
                    presentingVaRightEye: decryptedData.presentingVaRightEye,
                    presentingVaLeftEye: decryptedData.presentingVaLeftEye,
                    referredForRefraction: decryptedData.referredForRefraction || false,

                    // Refraction Details (conditional)
                    sphericalPowerRight: decryptedData.sphericalPowerRight || null,
                    sphericalPowerLeft: decryptedData.sphericalPowerLeft || null,
                    cylindricalPowerRight: decryptedData.cylindricalPowerRight || null,
                    cylindricalPowerLeft: decryptedData.cylindricalPowerLeft || null,
                    axisRight: decryptedData.axisRight || null,
                    axisLeft: decryptedData.axisLeft || null,
                    bcvaRightEye: decryptedData.bcvaRightEye || null,
                    bcvaLeftEye: decryptedData.bcvaLeftEye || null,

                    // Main Cause
                    causeRightEye: decryptedData.causeRightEye || null,
                    causeRightEyeOther: decryptedData.causeRightEyeOther || null,
                    causeLeftEye: decryptedData.causeLeftEye || null,
                    causeLeftEyeOther: decryptedData.causeLeftEyeOther || null,

                    // Barriers
                    barrier1: decryptedData.barrier1 || null,
                    barrier2: decryptedData.barrier2 || null,

                    // Follow-up Details (conditional)
                    timeSinceLastCheckup: decryptedData.timeSinceLastCheckup || null,
                    placeOfLastRefraction: decryptedData.placeOfLastRefraction || null,
                    costOfGlasses: decryptedData.costOfGlasses || null,
                    usesSpectacleRegularly: decryptedData.usesSpectacleRegularly || null,
                    spectacleAlignmentCentering: decryptedData.spectacleAlignmentCentering || null,
                    spectacleScratches: decryptedData.spectacleScratches || null,
                    spectacleFrameIntegrity: decryptedData.spectacleFrameIntegrity || null,

                    // Advice
                    spectaclesPrescribed: decryptedData.spectaclesPrescribed || false,
                    referredToOphthalmologist: decryptedData.referredToOphthalmologist || false,

                    // Metadata
                    partnerId: deviceAuth.user.partnerId || '',
                    submittedBy: deviceAuth.userId,
                    submittedAt: decryptedData.submittedAt ? new Date(decryptedData.submittedAt) : now,
                    teamEditDeadline,
                    partnerEditDeadline,
                    createdAt: now,
                    updatedAt: now
                }).returning();

                const newSurvey = insertedSurvey[0];

                results.push({
                    localId: encryptedForm.localId,
                    success: true,
                    surveyId: newSurvey.id,
                    timestamp: newSurvey.submittedAt.toISOString(),
                    ack: 'Form received and processed successfully'
                });

            } catch (formErr: any) {
                console.error(`Error processing form ${encryptedForm.localId}:`, formErr);

                // Log individual form error
                await logAudit({
                    action: 'bulk_sync_form_error',
                    entityType: 'survey_response',
                    userId: deviceAuth.userId,
                    newData: {
                        localId: encryptedForm.localId,
                        error: formErr.message,
                        deviceId: deviceAuth.deviceId,
                        ipAddress: event.getClientAddress(),
                        userAgent: event.request.headers.get('user-agent')
                    }
                });

                results.push({
                    localId: encryptedForm.localId,
                    success: false,
                    error: formErr.message || 'Failed to process form'
                });
            }
        }

        // Log successful bulk sync operation
        const successfulForms = results.filter(r => r.success).length;
        const failedForms = results.filter(r => !r.success).length;

        await logAudit({
            action: 'bulk_sync_completed',
            entityType: 'sync_operation',
            userId: deviceAuth.userId,
            newData: {
                totalForms: bulkRequest.forms.length,
                successfulForms,
                failedForms,
                deviceId: deviceAuth.deviceId,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: true,
            processed: bulkRequest.forms.length,
            results
        } as BulkSyncResponse);

    } catch (err: any) {
        console.error('Bulk sync error:', err);

        // Log system error
        await logAudit({
            action: 'bulk_sync_error',
            entityType: 'sync_operation',
            userId: err.userId || null,
            newData: {
                error: err.message,
                requestBody: JSON.stringify(await event.request.clone().json()),
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            processed: 0,
            results: [],
            error: err.message || 'Failed to process bulk sync request'
        } as BulkSyncResponse, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};