import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { surveyResponses, users, schools, districts, partners } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, locals }) => {
    const user = await requireAuth(locals);
    const surveyId = params.id;

    // Get survey with all related data
    const surveyResult = await db
        .select({
            survey: surveyResponses,
            school: {
                id: schools.id,
                name: schools.name,
                code: schools.code,
                address: schools.address,
                phone: schools.contactPhone,
                type: schools.schoolType,
                area: schools.areaType
            },
            district: {
                id: districts.id,
                name: districts.name,
                code: districts.code
            },
            partner: {
                id: partners.id,
                name: partners.name,
                code: partners.code
            },
            submittedByUser: {
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role
            },
            lastEditedByUser: {
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role
            }
        })
        .from(surveyResponses)
        .leftJoin(schools, eq(surveyResponses.schoolId, schools.id))
        .leftJoin(districts, eq(surveyResponses.districtId, districts.id))
        .leftJoin(partners, eq(surveyResponses.partnerId, partners.id))
        .leftJoin(users, eq(surveyResponses.submittedBy, users.id))
        .leftJoin(users, eq(surveyResponses.lastEditedBy, users.id))
        .where(eq(surveyResponses.id, surveyId))
        .limit(1);

    if (!surveyResult[0]) {
        throw error(404, 'Survey not found');
    }

    const { survey, school, district, partner, submittedByUser, lastEditedByUser } = surveyResult[0];

    // Partner scoping check
    if (user.role !== 'national_admin' && user.role !== 'data_manager') {
        if (survey.partnerId !== user.partnerId) {
            throw error(403, 'Access denied: You can only view surveys from your partner');
        }
    }

    // Calculate edit permissions
    const now = new Date();
    const submittedTime = new Date(survey.submittedAt);
    const hoursSinceSubmission = (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);

    let canEdit = false;
    let editReason = '';

    if (user.role === 'national_admin' || user.role === 'data_manager') {
        canEdit = true;
        editReason = 'Administrators can edit any survey';
    } else if (user.role === 'partner_manager' && hoursSinceSubmission < (15 * 24)) {
        canEdit = true;
        editReason = `Partner managers can edit for 15 days (${Math.round((15 * 24) - hoursSinceSubmission)} hours remaining)`;
    } else if (user.role === 'team_member' && survey.submittedBy === user.id && hoursSinceSubmission < 24) {
        canEdit = true;
        editReason = `Team members can edit their own surveys for 24 hours (${Math.round(24 - hoursSinceSubmission)} hours remaining)`;
    }

    return {
        survey,
        school,
        district,
        partner,
        submittedByUser,
        lastEditedByUser,
        permissions: {
            canEdit,
            editReason
        },
        user: {
            id: user.id,
            role: user.role,
            partnerId: user.partnerId
        }
    };
};