import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const dbUrl = buildDbUrl();

const client = postgres(dbUrl, {
	// Connection pool settings
	max: 25,
	idle_timeout: 30,
	connect_timeout: 10,
	// Enable detailed logging in development
	debug: process.env.NODE_ENV === 'development' ? (conn, query, params, types) => {
		console.log('[DB]', query);
	} : undefined
});

export const db = drizzle(client, { schema });

function buildDbUrl(): string {
	if (env.DATABASE_URL) return env.DATABASE_URL;

	const host = env.DB_HOST;
	const port = env.DB_PORT;
	const name = env.DB_NAME;
	const user = env.DB_USER;
	const password = env.DB_PASSWORD;

	if (!host || !port || !name || !user || !password) {
		throw new Error('Database connection info missing: set either DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD');
	}

	const encodedUser = encodeURIComponent(user);
	const encodedPass = encodeURIComponent(password);

	return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${name}`;
}
