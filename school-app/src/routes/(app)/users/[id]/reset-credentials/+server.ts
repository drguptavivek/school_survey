import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireUserAccess } from '$lib/server/guards';
import { generateSecureTemporaryPassword, hashPassword } from '$lib/server/user-utils';

export const POST: RequestHandler = async (event) => {
	const targetUserId = event.params.id;
	await requireUserAccess(event, targetUserId);

	const temporaryPassword = generateSecureTemporaryPassword();
	const passwordHash = await hashPassword(temporaryPassword);

	const updated = await db
		.update(users)
		.set({
			passwordHash,
			temporaryPassword,
			updatedAt: new Date()
		})
		.where(eq(users.id, targetUserId))
		.returning({
			id: users.id,
			email: users.email,
			code: users.code,
			temporaryPassword: users.temporaryPassword
		});

	if (!updated[0]) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json({
		id: updated[0].id,
		email: updated[0].email,
		code: updated[0].code,
		temporaryPassword: updated[0].temporaryPassword
	});
};

