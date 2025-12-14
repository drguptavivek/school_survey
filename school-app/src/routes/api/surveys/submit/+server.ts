import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { surveyResponses, users, schools, districts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireDeviceAuth } from '$lib/server/device-token';
import { logAudit } from '$lib/server/audit';
import { validateSurveyUniqueId } from '$lib/server/validation';

interface SurveySubmissionRequest {
    localId: string;
    surveyUniqueId: string;
    surveyDate: string;
    districtId: string;
    areaType: string;
    schoolId: string;
    schoolType: string;
    class: number;
    section: string;
    rollNo: string;
    studentName: string;
    sex: string;
    age: number;
    consent: string;
    usesDistanceGlasses: boolean;
    unaidedVaRightEye?: string;
    unaidedVaLeftEye?: string;
    presentingVaRightEye: string;
    presentingVaLeftEye: string;
    referredForRefraction: boolean;
    sphericalPowerRight?: number;
    sphericalPowerLeft?: number;
    cylindricalPowerRight?: number;
    cylindricalPowerLeft?: number;
    axisRight?: number;
    axisLeft?: number;
    bcvaRightEye?: string;
    bcvaLeftEye?: string;
    causeRightEye?: string;
    causeRightEyeOther?: string;
    causeLeftEye?: string;
    causeLeftEyeOther?: string;
    barrier1?: string;
    barrier2?: string;
    timeSinceLastCheckup?: string;
    placeOfLastRefraction?: string;
    costOfGlasses?: string;
    usesSpectacleRegularly?: boolean;
    spectacleAlignmentCentering?: boolean;
    spectacleScratches?: string;
    spectacleFrameIntegrity?: string;
    spectaclesPrescribed: boolean;
    referredToOphthalmologist: boolean;
    submittedAt?: string;
}

interface SurveySubmissionResponse {
    success: boolean;
    surveyId?: string;
    timestamp?: string;
    ack?: string;
    error?: string;
    existingId?: string;
}

export const POST = async (event: RequestEvent): Promise<Response> => {
    let deviceAuth: any = null;

    try {
        // Verify device authentication
        deviceAuth = await requireDeviceAuth(event);

        const surveyData: SurveySubmissionRequest = await event.request.json();

        // Validate required fields
        const requiredFields = [
            'localId', 'surveyUniqueId', 'surveyDate', 'districtId', 'areaType',
            'schoolId', 'schoolType', 'class', 'section', 'rollNo', 'studentName',
            'sex', 'age', 'consent', 'usesDistanceGlasses', 'presentingVaRightEye',
            'presentingVaLeftEye', 'referredForRefraction', 'spectaclesPrescribed',
            'referredToOphthalmologist'
        ];

        for (const field of requiredFields) {
            if (surveyData[field as keyof SurveySubmissionRequest] === undefined ||
                surveyData[field as keyof SurveySubmissionRequest] === null) {
                return json({
                    success: false,
                    error: `Missing required field: ${field}`
                } as SurveySubmissionResponse, { status: 400 });
            }
        }

        // Validate survey unique ID format
        if (!validateSurveyUniqueId(surveyData.surveyUniqueId)) {
            return json({
                success: false,
                error: 'Invalid survey unique ID format'
            } as SurveySubmissionResponse, { status: 400 });
        }

        // Verify school access (partner scoping)
        // National admin and data manager can access any school
        let schoolAccess;
        if (deviceAuth.user.role === 'national_admin' || deviceAuth.user.role === 'data_manager') {
            schoolAccess = await db.select({
                school: schools,
                district: districts
            })
                .from(schools)
                .innerJoin(districts, eq(schools.districtId, districts.id))
                .where(eq(schools.id, surveyData.schoolId))
                .limit(1);
        } else {
            // Partner managers and team members are restricted to their partner's schools
            schoolAccess = await db.select({
                school: schools,
                district: districts
            })
                .from(schools)
                .innerJoin(districts, eq(schools.districtId, districts.id))
                .where(and(
                    eq(schools.id, surveyData.schoolId),
                    eq(districts.partnerId, deviceAuth.user.partnerId)
                ))
                .limit(1);
        }

        if (!schoolAccess[0]) {
            await logAudit({
                action: 'survey_submission_unauthorized',
                entityType: 'survey_response',
                userId: deviceAuth.userId,
                newData: {
                    schoolId: surveyData.schoolId,
                    reason: 'School not found or access denied',
                    surveyUniqueId: surveyData.surveyUniqueId,
                    localId: surveyData.localId,
                    ipAddress: event.getClientAddress(),
                    userAgent: event.request.headers.get('user-agent')
                }
            });

            return json({
                success: false,
                error: 'School access denied'
            } as SurveySubmissionResponse, { status: 403 });
        }

        // Check for duplicate survey
        const existingSurvey = await db.select()
            .from(surveyResponses)
            .where(eq(surveyResponses.surveyUniqueId, surveyData.surveyUniqueId))
            .limit(1);

        if (existingSurvey[0]) {
            // Log duplicate submission attempt
            await logAudit({
                action: 'survey_duplicate_submission',
                entityType: 'survey_response',
                entityId: existingSurvey[0].id,
                userId: deviceAuth.userId,
                newData: {
                    surveyUniqueId: surveyData.surveyUniqueId,
                    localId: surveyData.localId,
                    existingId: existingSurvey[0].id,
                    ipAddress: event.getClientAddress(),
                    userAgent: event.request.headers.get('user-agent')
                }
            });

            return json({
                success: false,
                error: 'Duplicate survey',
                existingId: existingSurvey[0].id
            } as SurveySubmissionResponse, { status: 409 });
        }

        // Calculate edit deadlines
        const now = new Date();
        const teamEditDeadline = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
        const partnerEditDeadline = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 days

        // Insert survey
        let insertedSurvey;
        try {
            insertedSurvey = await db.insert(surveyResponses).values({
            // Basic Details
            surveyUniqueId: surveyData.surveyUniqueId,
            surveyDate: surveyData.surveyDate, // Let Drizzle handle the date conversion
            districtId: surveyData.districtId,
            areaType: surveyData.areaType,
            schoolId: surveyData.schoolId,
            schoolType: surveyData.schoolType,
            class: surveyData.class,
            section: surveyData.section,
            rollNo: surveyData.rollNo,
            studentName: surveyData.studentName.trim(),
            sex: surveyData.sex,
            age: surveyData.age,
            consent: surveyData.consent,

            // Distance Vision
            usesDistanceGlasses: Boolean(surveyData.usesDistanceGlasses),
            unaided_va_right_eye: surveyData.unaidedVaRightEye || null,
            unaided_va_left_eye: surveyData.unaidedVaLeftEye || null,
            presenting_va_right_eye: surveyData.presentingVaRightEye,
            presenting_va_left_eye: surveyData.presentingVaLeftEye,
            referredForRefraction: Boolean(surveyData.referredForRefraction),

            // Refraction Details (conditional)
            sphericalPowerRight: surveyData.sphericalPowerRight || null,
            sphericalPowerLeft: surveyData.sphericalPowerLeft || null,
            cylindricalPowerRight: surveyData.cylindricalPowerRight || null,
            cylindricalPowerLeft: surveyData.cylindricalPowerLeft || null,
            axisRight: surveyData.axisRight || null,
            axisLeft: surveyData.axisLeft || null,
            bcvaRightEye: surveyData.bcvaRightEye || null,
            bcvaLeftEye: surveyData.bcvaLeftEye || null,

            // Main Cause
            causeRightEye: surveyData.causeRightEye || null,
            causeRightEyeOther: surveyData.causeRightEyeOther || null,
            causeLeftEye: surveyData.causeLeftEye || null,
            causeLeftEyeOther: surveyData.causeLeftEyeOther || null,

            // Barriers
            barrier1: surveyData.barrier1 || null,
            barrier2: surveyData.barrier2 || null,

            // Follow-up Details (conditional)
            timeSinceLastCheckup: surveyData.timeSinceLastCheckup || null,
            placeOfLastRefraction: surveyData.placeOfLastRefraction || null,
            costOfGlasses: surveyData.costOfGlasses || null,
            usesSpectacleRegularly: Boolean(surveyData.usesSpectacleRegularly || false),
            spectacleAlignmentCentering: Boolean(surveyData.spectacleAlignmentCentering || false),
            spectacleScratches: surveyData.spectacleScratches || null,
            spectacleFrameIntegrity: surveyData.spectacleFrameIntegrity || null,

            // Advice
            spectaclesPrescribed: Boolean(surveyData.spectaclesPrescribed),
            referredToOphthalmologist: Boolean(surveyData.referredToOphthalmologist),

            // Metadata
            partnerId: deviceAuth.user.partnerId || '508dfc65-5cbb-4f3e-a7c7-f21f72979c4d', // Fallback partner for admin users
            submittedBy: deviceAuth.userId,
            submittedAt: surveyData.submittedAt ? new Date(surveyData.submittedAt) : now,
            teamEditDeadline,
            partnerEditDeadline,
            createdAt: now,
            updatedAt: now
            }).returning();
        } catch (dbError: any) {
            console.error('Database insertion error:', dbError);
            console.error('Database error cause:', dbError.cause);
            console.error('Database error details:', JSON.stringify(dbError, null, 2));
            throw new Error(`Database error: ${dbError.message} | Cause: ${dbError.cause?.message || 'Unknown'}`);
        }

        const newSurvey = insertedSurvey[0];

        // Log successful submission with comprehensive audit trail
        await logAudit({
            action: 'create',
            entityType: 'survey_response',
            entityId: newSurvey.id,
            userId: deviceAuth.userId,
            newData: {
                surveyUniqueId: surveyData.surveyUniqueId,
                schoolId: surveyData.schoolId,
                studentName: surveyData.studentName,
                class: surveyData.class,
                section: surveyData.section,
                localId: surveyData.localId,
                submittedAt: newSurvey.submittedAt,
                deviceId: deviceAuth.deviceId,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        // **Immediate ACK Response**
        return json({
            success: true,
            surveyId: newSurvey.id,
            timestamp: newSurvey.submittedAt.toISOString(),
            ack: 'Form received and processed successfully'
        } as SurveySubmissionResponse);

    } catch (err: any) {
        console.error('Survey submission error:', err);

        // Log system error
        await logAudit({
            action: 'survey_submission_error',
            entityType: 'survey_response',
            userId: deviceAuth?.userId || null,
            newData: {
                error: err.message,
                ipAddress: event.getClientAddress(),
                userAgent: event.request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: err.message || 'Failed to submit survey'
        } as SurveySubmissionResponse, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};