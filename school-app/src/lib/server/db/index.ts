import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL, {
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
