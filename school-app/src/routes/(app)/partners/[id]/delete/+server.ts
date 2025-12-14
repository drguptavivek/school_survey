import { db } from '$lib/server/db';
import { partners, districts, schools } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import { error, json } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { logAudit } from '$lib/server/audit';

export const DELETE: RequestHandler = async (event) => {
	await requireNationalAdmin(event);
	const { id } = event.params;

	// Get the partner record
	const partnerRecord = await db
		.select()
		.from(partners)
		.where(eq(partners.id, id))
		.limit(1);

	if (partnerRecord.length === 0) {
		throw error(404, 'Partner not found');
	}

	const partner = partnerRecord[0];

	// Check if partner has any non-deleted districts (soft delete considerations)
	const districtsCount = await db
		.select()
		.from(districts)
		.where(and(eq(districts.partnerId, id), isNull(districts.deletedAt)))
		.limit(1);

	if (districtsCount.length > 0) {
		return json(
			{
				error: 'Cannot delete partner with active districts',
				details: 'Please deactivate all districts under this partner first'
			},
			{ status: 400 }
		);
	}

	// Perform soft delete: set deletedAt and isActive = false
	const updated = await db
		.update(partners)
		.set({
			deletedAt: new Date(),
			isActive: false,
			updatedAt: new Date()
		})
		.where(eq(partners.id, id))
		.returning({ id: partners.id });

	if (updated.length === 0) {
		throw error(500, 'Failed to delete partner');
	}

	// Log audit trail
	await logAudit({
		event,
		userId: event.locals.user?.id,
		action: 'partner_deleted',
		entityType: 'partner',
		entityId: id,
		oldData: partner,
		newData: {
			...partner,
			deletedAt: new Date(),
			isActive: false
		}
	});

	return json({ success: true, message: 'Partner soft-deleted successfully' });
};
