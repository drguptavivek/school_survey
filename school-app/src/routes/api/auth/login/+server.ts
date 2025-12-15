import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, deviceTokens, partners } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from '$lib/server/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validateEmail } from '$lib/server/validation';

interface LoginRequest {
    email: string;
    password: string;
    deviceId: string;
    deviceInfo: string;
}

interface LoginResponse {
    success: boolean;
    user?: {
        id: string;
        email: string;
        role: string;
        partnerId: string | null;
        partnerName?: string | null;
        name: string;
    };
    deviceToken?: string;
    expiresAt?: string;
    requiresPinSetup?: boolean;
    message?: string;
    error?: string;
}

export const POST = async ({ request, getClientAddress }: RequestEvent): Promise<Response> => {
    try {
        const body: LoginRequest = await request.json();

        // Validate required fields
        const { email, password, deviceId, deviceInfo } = body;

        if (!email || !password || !deviceId || !deviceInfo) {
            return json({
                success: false,
                error: 'Missing required fields: email, password, deviceId, deviceInfo'
            } as LoginResponse, { status: 400 });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return json({
                success: false,
                error: 'Invalid email format'
            } as LoginResponse, { status: 400 });
        }

        // Find user by email
        const user = await db.select()
            .from(users)
            .where(and(
                eq(users.email, email.toLowerCase().trim()),
                eq(users.isActive, true)
            ))
            .limit(1);

        if (!user[0]) {
            // Log failed login attempt
            await logAudit({
                action: 'login_failed',
                entityType: 'user',
                newData: {
                    email: email.toLowerCase().trim(),
                    deviceId,
                    deviceInfo,
                    reason: 'user_not_found',
                    ipAddress: getClientAddress(),
                    userAgent: request.headers.get('user-agent')
                }
            });

            return json({
                success: false,
                error: 'Invalid credentials'
            } as LoginResponse, { status: 401 });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user[0].passwordHash);
        if (!isPasswordValid) {
            // Log failed login attempt
            await logAudit({
                action: 'login_failed',
                entityType: 'user',
                entityId: user[0].id,
                userId: user[0].id,
                newData: {
                    deviceId,
                    deviceInfo,
                    reason: 'invalid_password',
                    ipAddress: getClientAddress(),
                    userAgent: request.headers.get('user-agent')
                }
            });

            return json({
                success: false,
                error: 'Invalid credentials'
            } as LoginResponse, { status: 401 });
        }

        // Update last login time
        await db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user[0].id));

        // Get partner name if applicable
        let partnerName: string | null = null;
        if (user[0].partnerId) {
            const partner = await db
                .select({ name: partners.name })
                .from(partners)
                .where(eq(partners.id, user[0].partnerId))
                .limit(1);
            partnerName = partner[0]?.name || null;
        }

        // Generate device token (long-lived for Android app)
        const deviceToken = generateDeviceToken(user[0].id, deviceId);
        const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year

        // Check if device token already exists for this device
        const existingToken = await db.select()
            .from(deviceTokens)
            .where(and(
                eq(deviceTokens.userId, user[0].id),
                eq(deviceTokens.deviceId, deviceId),
                eq(deviceTokens.isRevoked, false)
            ))
            .limit(1);

        let insertedToken;

        if (existingToken[0]) {
            // Update existing token
            const updated = await db.update(deviceTokens)
                .set({
                    token: deviceToken,
                    deviceInfo,
                    expiresAt,
                    lastUsed: new Date(),
                    updatedAt: new Date(),
                    ipAddress: getClientAddress(),
                    userAgent: request.headers.get('user-agent')
                })
                .where(eq(deviceTokens.id, existingToken[0].id))
                .returning();

            insertedToken = updated[0];
        } else {
            // Create new device token
            const inserted = await db.insert(deviceTokens).values({
                userId: user[0].id,
                deviceId,
                token: deviceToken,
                deviceInfo,
                expiresAt,
                ipAddress: getClientAddress(),
                userAgent: request.headers.get('user-agent')
            }).returning();

            insertedToken = inserted[0];
        }

        // Comprehensive audit logging
        await logAudit({
            action: 'device_token_issued',
            entityType: 'device_token',
            entityId: insertedToken.id,
            userId: user[0].id,
            newData: {
                device_id: deviceId,
                device_info: deviceInfo,
                expires_at: expiresAt.toISOString(),
                ip_address: getClientAddress(),
                user_agent: request.headers.get('user-agent')
            }
        });

        // Return success response
        return json({
            success: true,
            user: {
                id: user[0].id,
                email: user[0].email,
                role: user[0].role,
                partnerId: user[0].partnerId,
                partnerName,
                name: user[0].name
            },
            deviceToken,
            expiresAt: expiresAt.toISOString(),
            requiresPinSetup: true,
            message: 'Login successful. Please set up your local PIN for offline access.'
        } as LoginResponse);

    } catch (err) {
        console.error('Login error:', err);

        // Log system error
        await logAudit({
            action: 'login_error',
            entityType: 'system',
            newData: {
                error: err instanceof Error ? err.message : 'Unknown error',
                requestBody: JSON.stringify(await request.clone().json()),
                ipAddress: getClientAddress(),
                userAgent: request.headers.get('user-agent')
            }
        });

        return json({
            success: false,
            error: 'Internal server error'
        } as LoginResponse, { status: 500 });
    }
};

// Generate a secure device token
function generateDeviceToken(userId: string, deviceId: string): string {
    const payload = {
        userId,
        deviceId,
        type: 'device_token',
        timestamp: Date.now(),
        random: crypto.randomBytes(16).toString('hex')
    };

    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    // In production, use a proper JWT library
    // For now, create a simple token format
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', process.env.DEVICE_TOKEN_SECRET || 'default-secret')
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}
