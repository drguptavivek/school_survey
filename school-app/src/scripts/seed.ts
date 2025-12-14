#!/usr/bin/env node
import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../lib/server/db/schema';
import bcrypt from 'bcrypt';

// Load .env file
config();

const databaseUrl = buildDbUrl();

const HASH_ROUNDS = 12;

async function seedDatabase() {
	try {
		console.log('🌱 Seeding database with initial users...');

		const client = postgres(databaseUrl);
		const db = drizzle(client, { schema: { users } });

		// Hash passwords for demo accounts
		const adminPasswordHash = await bcrypt.hash('password123', HASH_ROUNDS);
		const managerPasswordHash = await bcrypt.hash('password123', HASH_ROUNDS);
		const teamPasswordHash = await bcrypt.hash('password123', HASH_ROUNDS);

		const testUsers = [
			{
				email: 'admin@example.com',
				passwordHash: adminPasswordHash,
				name: 'National Admin',
				role: 'national_admin',
				isActive: true
			},
			{
				email: 'manager@example.com',
				passwordHash: managerPasswordHash,
				name: 'Partner Manager',
				role: 'partner_manager',
				isActive: true
			},
			{
				email: 'team@example.com',
				passwordHash: teamPasswordHash,
				name: 'Team Member',
				role: 'team_member',
				isActive: true
			}
		];

		// Upsert test users (create if not exists, update password if exists)
		for (const user of testUsers) {
			const existingUser = await client`
				SELECT id FROM users WHERE email = ${user.email}
			`;

			if (existingUser.length > 0) {
				console.log(`🔄 Updating password for ${user.email}...`);
				await client`
					UPDATE users
					SET password_hash = ${user.passwordHash}
					WHERE email = ${user.email}
				`;
			} else {
				console.log(`✨ Creating new user ${user.email}...`);
				await db.insert(users).values(user);
			}
		}

		console.log('✅ Database seeding complete!');
		console.log('');
		console.log('Test Credentials:');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('National Admin:   admin@example.com / password123');
		console.log('Partner Manager:  manager@example.com / password123');
		console.log('Team Member:      team@example.com / password123');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

		await client.end();
	} catch (error) {
		console.error('❌ Error seeding database:', error);
		process.exit(1);
	}
}

seedDatabase();

function buildDbUrl(): string {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

	const host = process.env.DB_HOST;
	const port = process.env.DB_PORT;
	const name = process.env.DB_NAME;
	const user = process.env.DB_USER;
	const password = process.env.DB_PASSWORD;

	if (!host || !port || !name || !user || !password) {
		throw new Error(
			'Database connection info missing: set either DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD'
		);
	}

	const encodedUser = encodeURIComponent(user);
	const encodedPass = encodeURIComponent(password);

	return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${name}`;
}
