import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { schools, districts } from '$lib/server/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth';
import { requireDeviceAuth } from '$lib/server/device-token';

interface SchoolDto {
    id: string;
    name: string;
    code: string;
    districtId: string;
    districtName: string;
    address?: string;
    schoolType: string;
    areaType: string;
    isActive: boolean;
}

interface SchoolsResponse {
    success: boolean;
    schools?: SchoolDto[];
    error?: string;
}

export const GET = async (event: RequestEvent): Promise<Response> => {
    try {
        // Check if this is a device token request or web session request
        const authHeader = event.request.headers.get('Authorization');
        let user;

        if (authHeader?.startsWith('Bearer ')) {
            // Device token authentication
            const deviceAuth = await requireDeviceAuth(event);
            user = deviceAuth.user;
        } else {
            // Web session authentication
            user = await requireAuth(event.locals);
        }

        // Get partnerId from query parameter or use user's partnerId
        const url = new URL(event.request.url);
        const partnerIdParam = url.searchParams.get('partnerId');
        const partnerId = partnerIdParam || user.partnerId;

        if (!partnerId) {
            return json({
                success: false,
                error: 'Partner ID is required'
            } as SchoolsResponse, { status: 400 });
        }

        // Partner scoping check - users can only access their own partner's schools
        // unless they are national_admin or data_manager
        if (user.role !== 'national_admin' && user.role !== 'data_manager' && user.partnerId !== partnerId) {
            return json({
                success: false,
                error: 'Access denied: Cannot access schools from other partners'
            } as SchoolsResponse, { status: 403 });
        }

        // Get schools with district information for the specified partner
        const schoolsWithDistricts = await db.select({
            school: schools,
            district: districts
        })
            .from(schools)
            .innerJoin(districts, eq(schools.districtId, districts.id))
            .where(and(
                eq(districts.partnerId, partnerId),
                eq(schools.isActive, true)
            ))
            .orderBy(schools.name);

        // Format response
        const formattedSchools: SchoolDto[] = schoolsWithDistricts.map(({ school, district }) => ({
            id: school.id,
            name: school.name,
            code: school.code,
            districtId: school.districtId,
            districtName: district.name,
            address: school.address || undefined,
            schoolType: school.schoolType || 'other',
            areaType: school.areaType || 'rural',
            isActive: school.isActive
        }));

        return json({
            success: true,
            schools: formattedSchools
        } as SchoolsResponse);

    } catch (err: any) {
        console.error('Error getting schools:', err);

        return json({
            success: false,
            error: err.message || 'Failed to retrieve schools'
        } as SchoolsResponse, { status: err.message?.includes('authorization') ? 401 : 500 });
    }
};