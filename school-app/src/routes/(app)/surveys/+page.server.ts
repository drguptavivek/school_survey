import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { surveyResponses, users, schools, districts, partners } from '$lib/server/db/schema';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { logAudit } from '$lib/server/audit';

export const load: PageServerLoad = async ({ url, locals }) => {
    const user = await requireAuth(locals);

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const districtId = url.searchParams.get('district') || '';
    const schoolId = url.searchParams.get('school') || '';
    const partnerId = url.searchParams.get('partner') || '';

    const offset = (page - 1) * limit;

    // Build base query conditions
    const conditions = [];

    // Partner scoping for non-admin roles
    if (user.role !== 'national_admin' && user.role !== 'data_manager') {
        conditions.push(eq(surveyResponses.partnerId, user.partnerId || ''));
    }

    // Add search conditions
    if (search) {
        conditions.push(
            like(surveyResponses.studentName, `%${search}%`),
            like(surveyResponses.surveyUniqueId, `%${search}%`)
        );
    }

    if (districtId) {
        conditions.push(eq(surveyResponses.districtId, districtId));
    }

    if (schoolId) {
        conditions.push(eq(surveyResponses.schoolId, schoolId));
    }

    if (partnerId && (user.role === 'national_admin' || user.role === 'data_manager')) {
        conditions.push(eq(surveyResponses.partnerId, partnerId));
    }

    // Get surveys with related data
    const surveys = await db
        .select({
            survey: surveyResponses,
            school: {
                id: schools.id,
                name: schools.name,
                code: schools.code
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
                email: users.email
            }
        })
        .from(surveyResponses)
        .leftJoin(schools, eq(surveyResponses.schoolId, schools.id))
        .leftJoin(districts, eq(surveyResponses.districtId, districts.id))
        .leftJoin(partners, eq(surveyResponses.partnerId, partners.id))
        .leftJoin(users, eq(surveyResponses.submittedBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(surveyResponses.submittedAt))
        .limit(limit)
        .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
        .select({ count: sql`count(*)` })
        .from(surveyResponses)
        .where(and(...conditions));

    const totalCount = totalCountResult[0]?.count || 0;

    // Get filter options (only for admin roles)
    let districtsFilter = [];
    let schoolsFilter = [];
    let partnersFilter = [];

    if (user.role === 'national_admin' || user.role === 'data_manager') {
        // Get all active partners
        partnersFilter = await db
            .select({
                id: partners.id,
                name: partners.name,
                code: partners.code
            })
            .from(partners)
            .where(eq(partners.isActive, true))
            .orderBy(partners.name);

        // Get districts based on partner filter
        if (partnerId) {
            districtsFilter = await db
                .select({
                    id: districts.id,
                    name: districts.name,
                    code: districts.code
                })
                .from(districts)
                .where(and(
                    eq(districts.partnerId, partnerId),
                    eq(districts.isActive, true)
                ))
                .orderBy(districts.name);
        }

        // Get schools based on district filter
        if (districtId) {
            schoolsFilter = await db
                .select({
                    id: schools.id,
                    name: schools.name,
                    code: schools.code
                })
                .from(schools)
                .where(and(
                    eq(schools.districtId, districtId),
                    eq(schools.isActive, true)
                ))
                .orderBy(schools.name);
        }
    } else {
        // Non-admin users get their partner's districts and schools
        if (user.partnerId) {
            districtsFilter = await db
                .select({
                    id: districts.id,
                    name: districts.name,
                    code: districts.code
                })
                .from(districts)
                .where(and(
                    eq(districts.partnerId, user.partnerId),
                    eq(districts.isActive, true)
                ))
                .orderBy(districts.name);

            if (districtId) {
                schoolsFilter = await db
                    .select({
                        id: schools.id,
                        name: schools.name,
                        code: schools.code
                    })
                    .from(schools)
                    .where(and(
                        eq(schools.districtId, districtId),
                        eq(schools.partnerId, user.partnerId),
                        eq(schools.isActive, true)
                    ))
                    .orderBy(schools.name);
            }
        }
    }

    return {
        surveys: surveys.map(item => ({
            ...item.survey,
            school: item.school,
            district: item.district,
            partner: item.partner,
            submittedByUser: item.submittedByUser,
            // Calculate edit status based on user role and submission time
            editStatus: getEditStatus(user, item.survey.submittedAt, item.survey.submittedBy)
        })),
        pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: offset + limit < totalCount,
            hasPrev: page > 1
        },
        filters: {
            search,
            districtId,
            schoolId,
            partnerId
        },
        filterOptions: {
            districts: districtsFilter,
            schools: schoolsFilter,
            partners: partnersFilter
        },
        user: {
            id: user.id,
            role: user.role,
            partnerId: user.partnerId
        }
    };
};

// Helper function to determine edit status
function getEditStatus(user: any, submittedAt: Date, submittedBy: string): string {
    const now = new Date();
    const submittedTime = new Date(submittedAt);
    const hoursSinceSubmission = (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);

    // Check if user submitted the survey
    if (user.id === submittedBy) {
        if (user.role === 'team_member' && hoursSinceSubmission < 24) {
            return 'Can Edit';
        }
    }

    if (user.role === 'partner_manager' && hoursSinceSubmission < (15 * 24)) {
        return 'Can Edit';
    }

    if (user.role === 'national_admin' || user.role === 'data_manager') {
        return 'Can Edit';
    }

    return 'Read Only';
}