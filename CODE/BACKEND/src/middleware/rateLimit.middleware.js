/**
 * Redis-based Rate Limiter Middleware
 * Uses the SHARED Redis client from redis.config.js.
 *
 * ⚠️ SECURITY NOTE: This module previously created its own Redis connection,
 * which caused a fail-OPEN behaviour on Redis errors (it would call next() and
 * allow unlimited requests). It now uses the shared client and is fail-CLOSED
 * in production (returns 503 rather than bypassing the limiter).
 */

const { getRedisClient } = require('../config/redis.config');

/**
 * Creates a rate limiter middleware using the shared Redis connection.
 * @param {string} keyPrefix  - Prefix for redis keys
 * @param {number} windowSecs - Time window in seconds
 * @param {number} maxReqs    - Max requests allowed in window
 */
const createRateLimiter = (keyPrefix, windowSecs, maxReqs) => {
    return async (req, res, next) => {
        const client = getRedisClient();

        // Fail-closed in production: if Redis is unavailable don't bypass the limiter
        if (!client || !client.isOpen) {
            if (process.env.NODE_ENV === 'production') {
                console.error(`SECURITY: Redis unavailable in createRateLimiter [${keyPrefix}] — blocking request`);
                return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
            }
            // Dev mode: warn and allow through
            console.warn(`⚠️  RateLimit: Redis unavailable [${keyPrefix}] — skipping limit in dev`);
            return next();
        }

        try {
            const key = `rate:${keyPrefix}:${req.ip}`;
            const requests = await client.incr(key);

            if (requests === 1) {
                await client.expire(key, windowSecs);
            }

            if (requests > maxReqs) {
                const ttl = await client.ttl(key);
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests. Please try again later.',
                    retryAfter: ttl,
                });
            }

            next();
        } catch (error) {
            console.error(`Rate Limiter Redis Error [${keyPrefix}]:`, error.message);
            // Fail-closed in production
            if (process.env.NODE_ENV === 'production') {
                return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
            }
            next(); // Dev: allow through on error
        }
    };
};

// 3 forget-password requests per 15 min per IP
exports.forgotPasswordLimiter = createRateLimiter('forgot-pass', 15 * 60, 3);
// 10 reset-password attempts per hour per IP
exports.resetPasswordLimiter = createRateLimiter('reset-pass', 60 * 60, 10);
