/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const redis = require('redis');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Create Redis Client
// In a real app, this might be a singleton exported from a db/redis module.
// For now, initializing here or check if we can reuse one.
// The prompted code doesn't show a central redis client. I will create one here.
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
     * Generates a 6-digit OTP, hashes it, and stores in Redis.
     * Enforces rate limiting.
     */
    async generateOtp(email) {
        if (!redisClient.isOpen) await redisClient.connect();

        // Rate Limiting (Simple: 1 per minute)
        const rateKey = `rate:otp:${email}`;
        const isRateLimited = await redisClient.get(rateKey);
        if (isRateLimited) {
            throw new Error('Please wait before requesting another OTP');
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Hash it
        const hash = await bcrypt.hash(otp, 10);

        // Store: key = otp:email:<email>:register
        const key = `otp:email:${email}:register`;
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
     */
    async verifyOtp(email, enteredOtp) {
        if (!redisClient.isOpen) await redisClient.connect();

        const key = `otp:email:${email}:register`;
        const data = await redisClient.get(key);

        if (!data) {
            throw new Error('OTP expired or invalid');
        }

        let { hash, attempts } = JSON.parse(data);

        // Check Max Attempts
        if (attempts >= this.MAX_ATTEMPTS) {
            await redisClient.del(key); // Hard fail cleanup
            throw new Error('Max verification attempts reached. Please request a new OTP.');
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
                throw new Error('Max verification attempts reached. Please request a new OTP.');
            } else {
                // Update attempts, preserve remaining TTL
                const ttl = await redisClient.ttl(key);
                if (ttl > 0) {
                    await redisClient.set(key, JSON.stringify({ hash, attempts }), { EX: ttl });
                }
            }

            throw new Error('Invalid OTP');
        }
    }
}

module.exports = new OtpService();
