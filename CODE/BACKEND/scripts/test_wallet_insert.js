require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');
const crypto = require('crypto');

(async () => {
    try {
        const testUserId = crypto.randomUUID();

        // First create a test user
        console.log('Creating test user...');
        await db.execute(sql`
            INSERT INTO \`user\` (id, platformUid, username, email, passwordHash, legalName, dateOfBirth, phone, countryCode, state, regionCode, role, hostStatus, emailVerified, isBanned, registrationCompleted, termsAccepted, passwordUpdatedAt, lastLoginAt, createdAt, updatedAt)
            VALUES (${testUserId}, 'TEST-2025-0001', 'testuser', 'test@test.com', 'hash', 'Test User', '2000-01-01', '1234567890', '91', 'Test', 'IN', 'PLAYER', 'NOT_VERIFIED', 0, 0, 0, 1, NOW(), NOW(), NOW(), NOW())
        `);
        console.log('✅ User created');

        // Now try to create wallet
        console.log('Creating wallet...');
        await db.execute(sql`
            INSERT INTO wallet (id, userId, balance, locked, createdAt, updatedAt) 
            VALUES (${crypto.randomUUID()}, ${testUserId}, 0, 0, NOW(), NOW())
        `);
        console.log('✅ Wallet insert successful!');

        // Cleanup
        await db.execute(sql`DELETE FROM wallet WHERE userId = ${testUserId}`);
        await db.execute(sql`DELETE FROM \`user\` WHERE id = ${testUserId}`);
        console.log('✅ Cleanup done');

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error('Code:', e.code);
        console.error('SQL:', e.sql);
    }
    process.exit(0);
})();
