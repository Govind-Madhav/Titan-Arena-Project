/**
 * Test Script for Registration V1.0
 * Run with: node scripts/test-registration-flow.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const redis = require('redis');
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

const API_URL = 'http://localhost:5000/api'; // Adjust port if needed

// Helper for fetch wrapper
async function post(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || res.statusText);
    }
    return { data };
}

// Test Data
const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    legalName: 'Test Legal Name',
    dateOfBirth: '2000-01-01',
    phone: '1234567890',
    country: 'IN', // Matches countryCode length 3 limit (2-3 chars usually)
    state: 'Delhi',
    city: 'New Delhi',
    termsAccepted: true
};

async function runTest() {
    console.log('🚀 Starting Registration V1.0 Test Flow...');

    // Connect to Redis to fetch OTP
    const redisClient = redis.createClient();
    await redisClient.connect();

    try {
        // Step 1: Register
        console.log('\n1️⃣  Registering User...');
        try {
            const res = await post(`${API_URL}/auth/register`, testUser);
            console.log('✅ Registration API Success:', res.data.message);
        } catch (err) {
            console.error('❌ Registration Failed:', err.message);
            process.exit(1);
        }

        // Step 2: Verify DB State (Inactive)
        console.log('\n2️⃣  Verifying DB State (Inactive)...');
        const user = (await db.select().from(users).where(eq(users.email, testUser.email)).limit(1))[0];

        if (!user) throw new Error('User not found in DB');
        if (user.emailVerified) throw new Error('User should NOT be verified yet');
        if (user.registrationCompleted) throw new Error('Registration should NOT be completed yet');
        console.log(`✅ DB Verification Passed: UID=${user.platformUid}, Status=${user.emailVerified ? 'Verified' : 'Unverified'}`);

        // Step 3: Fetch OTP from Redis
        console.log('\n3️⃣  Fetching OTP from Redis...');
        const otpKey = `otp:email:${testUser.email}:register`;
        const otpDataRaw = await redisClient.get(otpKey);

        if (!otpDataRaw) throw new Error('OTP not found in Redis');

        const bcrypt = require('bcryptjs');
        const knownOtp = '123456';
        const knownHash = await bcrypt.hash(knownOtp, 10);

        await redisClient.set(otpKey, JSON.stringify({ hash: knownHash, attempts: 0 }), { EX: 300 });
        console.log(`✅ TEST HACK: Injected known OTP '${knownOtp}' into Redis for ${testUser.email}`);

        // Step 4: Verify OTP API
        console.log('\n4️⃣  Verifying Email with OTP...');
        let accessToken;
        try {
            const res = await post(`${API_URL}/auth/verify-email`, {
                email: testUser.email,
                otp: knownOtp
            });
            console.log('✅ Verification API Success:', res.data.message);
            accessToken = res.data.data.accessToken;
            if (!accessToken) throw new Error('No access token received');
        } catch (err) {
            console.error('❌ Verification Failed:', err.message);
            process.exit(1);
        }

        // Step 5: Verify Active State & token
        console.log('\n5️⃣  Verifying Active State...');
        const activeUser = (await db.select().from(users).where(eq(users.email, testUser.email)).limit(1))[0];
        if (!activeUser.emailVerified) throw new Error('User should be verified now');
        console.log('✅ User is Verified.');

        // Step 6: Test Login
        console.log('\n6️⃣  Testing Login...');
        try {
            const loginRes = await post(`${API_URL}/auth/login`, {
                email: testUser.email,
                password: testUser.password
            });
            console.log('✅ Login Success:', loginRes.data.message);
        } catch (err) {
            console.error('❌ Login Failed:', err.message);
        }

        console.log('\n🎉 Test Flow Completed Successfully!');

    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
    } finally {
        await redisClient.quit();
        process.exit(0);
    }
}

runTest();
