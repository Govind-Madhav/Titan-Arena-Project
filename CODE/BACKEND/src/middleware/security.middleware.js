/**
 * Security Middleware
 */
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Global Limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// Auth Limiter: 5 login attempts per hour
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

// Sensitive Action Limiter (e.g., Score Submission): 10 per minute
const actionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: 'Action limit exceeded.' }
});

module.exports = {
    globalLimiter,
    authLimiter,
    actionLimiter,
    helmet: helmet()
};
