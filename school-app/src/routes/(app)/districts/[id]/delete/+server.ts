import { db } from '$lib/server/db';
import { districts, schools } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { error, json } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { logAudit } from '$lib/server/audit';

export const DELETE: RequestHandler = async (event) => {
	await requireNationalAdmin(event);
	const { id } = event.params;

	// Get the district record
	const districtRecord = await db
		.select()
		.from(districts)
		.where(eq(districts.id, id))
		.limit(1);

	if (districtRecord.length === 0) {
		throw error(404, 'District not found');
	}

	const district = districtRecord[0];

	// Check if district has any non-deleted schools (soft delete considerations)
	const schoolsCount = await db
		.select()
		.from(schools)
		.where(and(eq(schools.districtId, id), eq(schools.isActive, true)))
		.limit(1);

	if (schoolsCount.length > 0) {
		return json(
			{
				error: 'Cannot delete district with active schools',
				details: 'Please deactivate all schools under this district first'
			},
			{ status: 400 }
		);
	}

	// Perform soft delete: set deletedAt and isActive = false
	const updated = await db
		.update(districts)
		.set({
			deletedAt: new Date(),
			isActive: false,
			updatedAt: new Date()
		})
		.where(eq(districts.id, id))
		.returning({ id: districts.id });

	if (updated.length === 0) {
		throw error(500, 'Failed to delete district');
	}

	// Log audit trail
	await logAudit({
		event,
		userId: event.locals.user?.id,
		action: 'district_deleted',
		entityType: 'district',
		entityId: id,
		oldData: district,
		newData: {
			...district,
			deletedAt: new Date(),
			isActive: false
		}
	});

	return json({ success: true, message: 'District soft-deleted successfully' });
};
