import { db } from '$lib/server/db';
import { schools } from '$lib/server/db/schema';
import { requireSchoolEditAccess } from '$lib/server/guards';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { logAudit } from '$lib/server/audit';

export const DELETE: RequestHandler = async (event) => {
	const { id } = event.params;
	await requireSchoolEditAccess(event, id);

	// Get the school record
	const schoolRecord = await db
		.select()
		.from(schools)
		.where(eq(schools.id, id))
		.limit(1);

	if (schoolRecord.length === 0) {
		throw error(404, 'School not found');
	}

	const school = schoolRecord[0];

	// Check if school has survey data - cannot delete schools with survey data
	if (school.hasSurveyData) {
		return json(
			{
				error: 'Cannot delete school with survey data',
				details: 'Schools that have survey data cannot be deleted. Please contact an administrator.'
			},
			{ status: 400 }
		);
	}

	// Perform soft delete: set deletedAt and isActive = false
	const updated = await db
		.update(schools)
		.set({
			deletedAt: new Date(),
			isActive: false,
			updatedAt: new Date()
		})
		.where(eq(schools.id, id))
		.returning({ id: schools.id });

	if (updated.length === 0) {
		throw error(500, 'Failed to delete school');
	}

	// Log audit trail
	await logAudit({
		event,
		userId: event.locals.user?.id,
		action: 'school_deleted',
		entityType: 'school',
		entityId: id,
		oldData: school,
		newData: {
			...school,
			deletedAt: new Date(),
			isActive: false
		}
	});

	return json({ success: true, message: 'School soft-deleted successfully' });
};
