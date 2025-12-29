/**
 * Redis-based Rate Limiter Middleware
 * Uses the existing Redis client to enforce limits.
 */
const redis = require('redis');

// We need a redis client. 
// Since we don't have a centralized redis module exporting the client globally yet (it was in otp.service),
// We should probably centralize it or create a new connection here using the same env.
// For robustness, let's create a connection here or reuse if we refactored.
// Given the current structure, creating a connection is safest.

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('RateLimit Redis Client Error', err));
redisClient.connect().catch(console.error);

/**
 * Creates a rate limiter middleware
 * @param {string} keyPrefix - Prefix for redis keys
 * @param {number} windowSeconds - Time window in seconds
 * @param {number} maxRequests - Max requests allowed in window
 */
const createRateLimiter = (keyPrefix, windowSeconds, maxRequests) => {
    return async (req, res, next) => {
        try {
            if (!redisClient.isOpen) await redisClient.connect();

            // key: rate:prefix:ip
            const key = `rate:${keyPrefix}:${req.ip}`;

            const requests = await redisClient.incr(key);

            if (requests === 1) {
                // Set expiry on first request
                await redisClient.expire(key, windowSeconds);
            }

            if (requests > maxRequests) {
                const ttl = await redisClient.ttl(key);
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests. Please try again later.',
                    retryAfter: ttl
                });
            }

            next();
        } catch (error) {
            console.error('Rate Limiter Error:', error);
            // Fail open (allow request) so we don't block users if Redis fails, 
            // but log critical error.
            next();
        }
    };
};

// Configured Limiters
exports.forgotPasswordLimiter = createRateLimiter('forgot-pass', 15 * 60, 3); // 3 requests per 15 mins
exports.resetPasswordLimiter = createRateLimiter('reset-pass', 60 * 60, 10);  // 10 attempts per hour (high because it's verification)
