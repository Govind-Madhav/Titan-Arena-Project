/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const redis = require('redis');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Create Redis Client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().catch(console.error);

class OtpService {
    constructor() {
        this.OTP_TTL = 300; // 5 minutes
        this.MAX_ATTEMPTS = 3;
    }

    /**
     * Generates a unique 6-digit OTP, hashes it, and stores it in Redis.
     * @param {string} email
     * @param {string} scope - 'register' or 'reset'
     */
    async generateOtp(email, scope = 'register') {
        if (!redisClient.isOpen) await redisClient.connect();

        // Rate Limiting (Simple: 1 per minute per scope)
        const rateKey = `rate:otp:${scope}:${email}`;
        const isRateLimited = await redisClient.get(rateKey);
        if (isRateLimited) {
            throw new Error('Please wait before requesting another code.');
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Hash it using HMAC or bcrypt? 
        // bcrypt is slow (good for passwords), but for OTPs with 5 min TTL, 
        // speed matters less than security. bcrypt is safer against leaks.
        const hash = await bcrypt.hash(otp, 10);

        // Store: key = otp:${scope}:${email}
        const key = `otp:${scope}:${email}`;
        const payload = JSON.stringify({
            hash,
            attempts: 0
        });

        // Set with TTL
        await redisClient.set(key, payload, { EX: this.OTP_TTL });

        // Set rate limit (60s)
        await redisClient.set(rateKey, '1', { EX: 60 });

        return otp; // Return plaintext to controller to send via email
    }

    /**
     * Verifies the OTP.
     * Enforces strict attempt limits.
     * Deletes on success.
     * @param {string} email 
     * @param {string} enteredOtp 
     * @param {string} scope 
     */
    async verifyOtp(email, enteredOtp, scope = 'register') {
        if (!redisClient.isOpen) await redisClient.connect();

        const key = `otp:${scope}:${email}`;
        const data = await redisClient.get(key);

        if (!data) {
            throw new Error('Code expired or invalid.');
        }

        let { hash, attempts } = JSON.parse(data);

        // Check Max Attempts
        if (attempts >= this.MAX_ATTEMPTS) {
            await redisClient.del(key); // Hard fail cleanup
            throw new Error('Too many failed attempts. Please request a new code.');
        }

        // Verify Hash
        const isValid = await bcrypt.compare(enteredOtp, hash);

        if (isValid) {
            // Success: Delete immediately
            await redisClient.del(key);
            return true;
        } else {
            // Failure: Increment attempts
            attempts += 1;

            if (attempts >= this.MAX_ATTEMPTS) {
                await redisClient.del(key);
                throw new Error('Too many failed attempts. Please request a new code.');
            } else {
                // Update attempts, preserve remaining TTL
                const ttl = await redisClient.ttl(key);
                if (ttl > 0) {
                    await redisClient.set(key, JSON.stringify({ hash, attempts }), { EX: ttl });
                }
            }

            throw new Error('Invalid code. Please try again.');
        }
    }
}

module.exports = new OtpService();
