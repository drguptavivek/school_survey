import { error, type RequestEvent } from '@sveltejs/kit';
import { db } from './db';
import { logAudit } from './audit';

// Simple in-memory rate limiter for development
// In production, use Redis or a dedicated rate limiting service
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests per window
    skipSuccessfulRequests?: boolean; // Don't count successful requests
    skipFailedRequests?: boolean; // Don't count failed requests
    message?: string; // Custom error message
}

/**
 * Rate limiting middleware
 */
export function createRateLimit(config: RateLimitConfig) {
    return async (event: RequestEvent, identifier?: string): Promise<void> => {
        const key = identifier || getClientIdentifier(event);
        const now = Date.now();

        // Clean up expired entries
        cleanupExpiredEntries(now);

        // Get or create rate limit entry
        let entry = rateLimitStore.get(key);
        if (!entry || now > entry.resetTime) {
            entry = {
                count: 0,
                resetTime: now + config.windowMs
            };
            rateLimitStore.set(key, entry);
        }

        // Increment counter
        entry.count++;

        // Check if limit exceeded
        if (entry.count > config.maxRequests) {
            // Log rate limit violation
            await logAudit({
                event,
                action: 'rate_limit_exceeded',
                entityType: 'security',
                metadata: {
                    identifier: key,
                    count: entry.count,
                    limit: config.maxRequests,
                    windowMs: config.windowMs,
                    resetTime: new Date(entry.resetTime).toISOString()
                },
                severity: 'high',
                category: 'security'
            });

            throw error(429, {
                message: config.message || `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
                retryAfter: Math.ceil((entry.resetTime - now) / 1000)
            });
        }

        // Add rate limit headers
        const responseHeaders = {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count).toString(),
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
        };

        // In SvelteKit, we can't directly set headers here, but the rate limiting logic is enforced
        // Headers would need to be set in the actual route handlers
    };
}

/**
 * Generate client identifier for rate limiting
 */
function getClientIdentifier(event: RequestEvent): string {
    // Try to get user ID from session
    const userId = event.locals.user?.id;
    if (userId) {
        return `user:${userId}`;
    }

    // Fall back to IP address
    const ip = event.getClientAddress();
    return `ip:${ip}`;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number): void {
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Predefined rate limit configurations
export const RateLimits = {
    // Authentication endpoints - very strict
    auth: createRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 attempts per 15 minutes
        message: 'Too many authentication attempts. Please try again later.'
    }),

    // API endpoints - moderate
    api: createRateLimit({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100, // 100 requests per minute
        message: 'API rate limit exceeded. Please slow down.'
    }),

    // Survey submission - per user
    surveySubmit: createRateLimit({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 surveys per minute
        message: 'Survey submission rate limit exceeded. Please slow down.'
    }),

    // Bulk sync - very strict
    bulkSync: createRateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 3, // 3 bulk syncs per 5 minutes
        message: 'Bulk sync rate limit exceeded. Please wait before syncing again.'
    }),

    // File operations
    fileOperations: createRateLimit({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20, // 20 file operations per minute
        message: 'File operation rate limit exceeded. Please slow down.'
    }),

    // Data export
    dataExport: createRateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5, // 5 exports per hour
        message: 'Data export rate limit exceeded. Please try again later.'
    })
};

/**
 * Apply rate limiting based on endpoint type
 */
export function applyRateLimit(type: keyof typeof RateLimits, event: RequestEvent): Promise<void> {
    return RateLimits[type](event);
}

/**
 * Advanced rate limiting with different rules for different user roles
 */
export function createRoleBasedRateLimit(configs: {
    [role: string]: RateLimitConfig;
}) {
    return async (event: RequestEvent): Promise<void> => {
        const user = event.locals.user;
        const role = user?.role || 'anonymous';
        const config = configs[role] || configs.anonymous || configs.default;

        if (!config) {
            throw error(500, 'Rate limit configuration not found');
        }

        const identifier = user ? `user:${user.id}` : getClientIdentifier(event);
        return createRateLimit(config)(event, identifier);
    };
}

// Role-based rate limit configurations
export const RoleBasedRateLimits = createRoleBasedRateLimit({
    // Admin users have higher limits
    national_admin: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 500, // 500 requests per minute
        message: 'Admin rate limit exceeded.'
    },
    data_manager: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 300, // 300 requests per minute
        message: 'Data manager rate limit exceeded.'
    },
    partner_manager: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 200, // 200 requests per minute
        message: 'Partner manager rate limit exceeded.'
    },
    team_member: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100, // 100 requests per minute
        message: 'Team member rate limit exceeded.'
    },
    // Anonymous users have strict limits
    anonymous: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20, // 20 requests per minute
        message: 'Anonymous rate limit exceeded. Please authenticate.'
    }
});

/**
 * Check if a request should be skipped from rate limiting
 */
export function shouldSkipRateLimit(event: RequestEvent): boolean {
    const url = event.request.url;
    const method = event.request.method;

    // Skip health checks and static assets
    if (url.includes('/health') || url.includes('/static') || url.includes('/favicon')) {
        return true;
    }

    // Skip GET requests for some endpoints (read-only operations)
    if (method === 'GET' && (url.includes('/api/schools') || url.includes('/api/partners'))) {
        return true;
    }

    return false;
}

/**
 * Rate limiting middleware that can be used in hooks
 */
export async function rateLimitMiddleware(event: RequestEvent): Promise<void> {
    // Skip certain requests
    if (shouldSkipRateLimit(event)) {
        return;
    }

    const url = event.request.url;
    const method = event.request.method;

    // Apply different rate limits based on endpoint
    if (url.includes('/auth/')) {
        return applyRateLimit('auth', event);
    } else if (url.includes('/surveys') && method === 'POST') {
        return applyRateLimit('surveySubmit', event);
    } else if (url.includes('/sync/upload')) {
        return applyRateLimit('bulkSync', event);
    } else if (url.includes('/export')) {
        return applyRateLimit('dataExport', event);
    } else if (url.startsWith('/api/')) {
        return applyRateLimit('api', event);
    } else {
        // Default to role-based rate limiting for other endpoints
        return RoleBasedRateLimits(event);
    }
}