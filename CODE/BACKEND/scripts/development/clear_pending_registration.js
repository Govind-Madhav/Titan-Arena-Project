require('dotenv').config();
const { createRedisClient, getRedisClient } = require('../../src/config/redis.config');

const email = process.argv[2];

if (!email) {
    console.log('Usage: node clear_pending_registration.js <email>');
    process.exit(1);
}

(async () => {
    try {
        // Initialize Redis
        await createRedisClient();
        const redis = getRedisClient();

        const pendingKey = `pending_registration:${email}`;
        const otpKey = `otp:${email}`;

        // Delete both keys
        await redis.del(pendingKey);
        await redis.del(otpKey);

        console.log(`✅ Cleared pending registration and OTP for: ${email}`);

        // Close Redis connection
        await redis.quit();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
