import { db } from '.';
import { users } from './schema';
import { hashPassword } from '../auth';

/**
 * Seed database with initial test users
 * This should only be run once during development setup
 */
export async function seedDatabase() {
	try {
		console.log('🌱 Seeding database with initial users...');

		// Hash passwords for demo accounts
		const adminPasswordHash = await hashPassword('password123');
		const managerPasswordHash = await hashPassword('password123');
		const teamPasswordHash = await hashPassword('password123');

		// Check if users already exist
		const existingUsers = await db.select().from(users).limit(1);

		if (existingUsers.length > 0) {
			console.log('⚠️  Database already seeded. Skipping...');
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
	} catch (error) {
		console.error('❌ Error seeding database:', error);
		throw error;
	}
}
