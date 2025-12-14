import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { surveyResponses } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireDeviceAuth } from '$lib/server/device-token';
import { validateSurveyUniqueId } from '$lib/server/validation';

interface UniqueIdValidationRequest {
    surveyUniqueId: string;
}

interface UniqueIdValidationResponse {
    success: boolean;
    isValid: boolean;
    exists: boolean;
    message?: string;
    existingSurveyId?: string;
}

export const POST = async (event: RequestEvent): Promise<Response> => {
    try {
        // Verify device authentication
        const deviceAuth = await requireDeviceAuth(event);

        const body: UniqueIdValidationRequest = await event.request.json();

        if (!body.surveyUniqueId) {
            return json({
                success: false,
                isValid: false,
                exists: false,
                message: 'Survey unique ID is required'
            } as UniqueIdValidationResponse, { status: 400 });
        }

        const surveyUniqueId = body.surveyUniqueId.trim();

        // Validate survey unique ID format
        if (!validateSurveyUniqueId(surveyUniqueId)) {
            return json({
                success: true,
                isValid: false,
                exists: false,
                message: 'Invalid survey unique ID format. Expected format: {district_code}-{school_code}-{class}-{section}-{roll_no}'
            } as UniqueIdValidationResponse);
        }

        // Check if survey unique ID already exists
        const existingSurvey = await db.select({
            id: surveyResponses.id,
            surveyUniqueId: surveyResponses.surveyUniqueId,
            submittedAt: surveyResponses.submittedAt,
            submittedBy: surveyResponses.submittedBy
        })
            .from(surveyResponses)
            .where(eq(surveyResponses.surveyUniqueId, surveyUniqueId))
            .limit(1);

        const exists = existingSurvey.length > 0;

        return json({
            success: true,
            isValid: true,
            exists,
            message: exists ? 'Survey unique ID already exists' : 'Survey unique ID is available',
            existingSurveyId: exists ? existingSurvey[0].id : undefined
        } as UniqueIdValidationResponse);

    } catch (err: any) {
        console.error('Unique ID validation error:', err);

        return json({
            success: false,
            isValid: false,
            exists: false,
            message: err.message || 'Failed to validate survey unique ID'
        } as UniqueIdValidationResponse, { status: err.message === 'No authorization token provided' ? 401 : 500 });
    }
};