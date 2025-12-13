#!/usr/bin/env node
import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../lib/server/db/schema';
import bcrypt from 'bcrypt';

// Load .env file
config();

const databaseUrl = process.env.DATABASE_URL ?? '';

if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set in .env file');
}

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

		// Check if users already exist
		const result = await client`SELECT COUNT(*) as count FROM users;`;
		const existingCount = (result[0] as { count: number }).count;

		if (existingCount > 0) {
			console.log('⚠️  Database already seeded. Skipping...');
			await client.end();
			return;
		}

		// Insert demo users
		await db.insert(users).values([
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
		]);

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
