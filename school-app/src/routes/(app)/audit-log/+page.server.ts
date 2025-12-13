import { db } from '$lib/server/db';
import { auditLogs, users } from '$lib/server/db/schema';
import { requireNationalAdmin } from '$lib/server/guards';
import type { PageServerLoad } from './$types';
import { sql, desc } from 'drizzle-orm';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async (event) => {
	await requireNationalAdmin(event);

	const pageParam = Number(event.url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
	const offset = (page - 1) * PAGE_SIZE;

	const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);

	const rows = await db
		.select({
			id: auditLogs.id,
			action: auditLogs.action,
			entityType: auditLogs.entityType,
			entityId: auditLogs.entityId,
			changes: auditLogs.changes,
			ipAddress: auditLogs.ipAddress,
			createdAt: auditLogs.createdAt,
			userId: auditLogs.userId,
			userName: users.name
		})
		.from(auditLogs)
		.leftJoin(users, sql`${auditLogs.userId} = ${users.id}`)
		.orderBy(desc(auditLogs.createdAt))
		.limit(PAGE_SIZE)
		.offset(offset);

	const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

	return {
		logs: rows,
		page,
		totalPages
	};
};
