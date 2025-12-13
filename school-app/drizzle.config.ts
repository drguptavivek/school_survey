import { defineConfig } from 'drizzle-kit';

const dbUrl = buildDbUrl();

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: dbUrl },
	verbose: true,
	strict: true
});

function buildDbUrl(): string {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

	const host = process.env.DB_HOST;
	const port = process.env.DB_PORT;
	const name = process.env.DB_NAME;
	const user = process.env.DB_USER;
	const password = process.env.DB_PASSWORD;

	if (!host || !port || !name || !user || !password) {
		throw new Error('Database connection info missing: set either DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD');
	}

	const encodedUser = encodeURIComponent(user);
	const encodedPass = encodeURIComponent(password);

	return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${name}`;
}
