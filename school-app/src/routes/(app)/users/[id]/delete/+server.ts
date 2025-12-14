import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { requireUserAccess } from '$lib/server/guards';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { logAudit } from '$lib/server/audit';

export const DELETE: RequestHandler = async (event) => {
	const { id } = event.params;
	await requireUserAccess(event, id);

	// Get the user record
	const userRecord = await db
		.select()
		.from(users)
		.where(eq(users.id, id))
		.limit(1);

	if (userRecord.length === 0) {
		throw error(404, 'User not found');
	}

	const user = userRecord[0];

	// Perform soft delete: set deletedAt and isActive = false
	const updated = await db
		.update(users)
		.set({
			deletedAt: new Date(),
			isActive: false,
			updatedAt: new Date()
		})
		.where(eq(users.id, id))
		.returning({ id: users.id });

	if (updated.length === 0) {
		throw error(500, 'Failed to delete user');
	}

	// Log audit trail
	await logAudit({
		event,
		userId: event.locals.user?.id,
		action: 'user_deleted',
		entityType: 'user',
		entityId: id,
		oldData: user,
		newData: {
			...user,
			deletedAt: new Date(),
			isActive: false
		}
	});

	return json({ success: true, message: 'User soft-deleted successfully' });
};
