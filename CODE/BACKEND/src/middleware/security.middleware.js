/**
 * Security Middleware (Enterprise Strict Mode)
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * 
 * Implements:
 * - Fail-Closed Redis Rate Limiting (rate-limiter-flexible)
 * - Strict CSP headers (No unsafe-inline)
 * - HTTP Parameter Pollution Protection
 * - NO blind sanitization (Anti-pattern removal)
 */

const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const helmet = require('helmet');
const hpp = require('hpp');
const { getRedisClient } = require('../config/redis.config');

// 1. Fail-Closed Redis Client Getter
const getClientOrFail = () => {
    const client = getRedisClient();

    if (client && client.isMock) {
        return null; // Signals fallback to Memory
    }

    if (!client || !client.isOpen) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ Security: Redis unavailable, using Memory Fallback.');
            return null;
        }
        // FAIL-CLOSED (Production): The security block MUST be active. 
        throw new Error('SECURITY CRITICAL: Redis unreachable. Traffic blocked for safety.');
    }
    return client;
};

// 2. Rate Limiters (Using rate-limiter-flexible)
let globalRateLimiter = null;
let authRateLimiter = null;
let availabilityCheckLimiter = null;

const initLimiters = () => {
    try {
        const redisClient = getClientOrFail();

        const limiterOptions = (points, duration, blockDuration = 0) => ({
            points,
            duration,
            blockDuration,
        });

        if (redisClient) {
            // Redis Mode
            globalRateLimiter = new RateLimiterRedis({ ...limiterOptions(500, 15 * 60), storeClient: redisClient, keyPrefix: 'global' });
            authRateLimiter = new RateLimiterRedis({ ...limiterOptions(20, 15 * 60, 60 * 5), storeClient: redisClient, keyPrefix: 'auth' });
            availabilityCheckLimiter = new RateLimiterRedis({ ...limiterOptions(100, 15 * 60, 60), storeClient: redisClient, keyPrefix: 'avail' });
        } else {
            // Memory Fallback (Dev Only)
            globalRateLimiter = new RateLimiterMemory(limiterOptions(500, 15 * 60));
            authRateLimiter = new RateLimiterMemory(limiterOptions(20, 15 * 60, 60 * 5));
            availabilityCheckLimiter = new RateLimiterMemory(limiterOptions(100, 15 * 60, 60));
        }

    } catch (e) {
        console.error('FAILED TO INITIALIZE RATELIMITERS:', e.message);
        // We let the middleware throw 500 later if client is missing
    }
};

// Initialize on load (if Redis is ready, otherwise middleware will catch it)
// We rely on index.js to connect Redis first.
setTimeout(initLimiters, 1000); // Small delay to allow Redis connection in index.js to complete

// Middleware Wrapper for Global Limiter
const globalLimiterMiddleware = async (req, res, next) => {
    try {
        if (!globalRateLimiter) initLimiters();
        await globalRateLimiter.consume(req.ip);
        next();
    } catch (rejRes) {
        if (rejRes instanceof Error) {
            // Redis failure (Fail-Closed)
            console.error('Critical Security Error:', rejRes.message);
            res.status(503).json({ success: false, message: 'Service Unavailable (Security)' });
        } else {
            // Rate limit exceeded
            res.status(429).json({ success: false, message: 'Too many requests' });
        }
    }
};

// Middleware Wrapper for Auth Limiter
const authLimiterMiddleware = async (req, res, next) => {
    try {
        if (!authRateLimiter) initLimiters();

        // Smart Key: IP + Email (if present) to prevent distributed attacks on one account
        const key = req.body.email ? `${req.ip}_${req.body.email}` : req.ip;

        await authRateLimiter.consume(key);
        next();
    } catch (rejRes) {
        if (rejRes instanceof Error) {
            console.error('Critical Security Error:', rejRes.message);
            res.status(503).json({ success: false, message: 'Service Unavailable (Security)' });
        } else {
            res.status(429).json({
                success: false,
                message: 'Too many login attempts. Please wait before trying again.'
            });
        }
    }
};

// Middleware Wrapper for Availability Check Limiter
const availabilityCheckLimiterMiddleware = async (req, res, next) => {
    try {
        if (!availabilityCheckLimiter) initLimiters();

        // Use IP as key for availability checks
        await availabilityCheckLimiter.consume(req.ip);
        next();
    } catch (rejRes) {
        if (rejRes instanceof Error) {
            console.error('Critical Security Error:', rejRes.message);
            res.status(503).json({ success: false, message: 'Service Unavailable (Security)' });
        } else {
            res.status(429).json({
                success: false,
                message: 'Too many availability checks. Please slow down.'
            });
        }
    }
};

// 3. Strict Helmet Configuration
const helmetConfig = helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"], // Strict: No unsafe-inline
            styleSrc: ["'self'"],  // Strict: No unsafe-inline (User requirement)
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'same-origin' }, // Strict
    crossOriginResourcePolicy: { policy: "same-origin" } // Strict
});

// 4. HTTP Parameter Pollution
const hppProtection = hpp();

module.exports = {
    globalLimiter: globalLimiterMiddleware,
    authLimiter: authLimiterMiddleware,
    availabilityCheckLimiter: availabilityCheckLimiterMiddleware,
    helmet: helmetConfig,
    hpp: hppProtection
};
