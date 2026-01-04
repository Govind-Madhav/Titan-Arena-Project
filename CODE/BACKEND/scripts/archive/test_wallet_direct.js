require('dotenv').config();
const { db } = require('../src/db');
const { wallets } = require('../src/db/schema');
const crypto = require('crypto');

(async () => {
    console.log('🧪 Testing wallet insert directly...\n');

    try {
        const testId = crypto.randomUUID();
        const now = new Date();

        console.log('Attempting to insert wallet with:');
        console.log({
            id: testId,
            userId: 'test-user-id-that-doesnt-exist',
            balance: 0,
            locked: 0,
            createdAt: now,
            updatedAt: now
        });

        await db.insert(wallets).values({
            id: testId,
            userId: 'test-user-id-that-doesnt-exist',
            balance: 0,
            locked: 0,
            createdAt: now,
            updatedAt: now
        });

        console.log('✅ Insert successful!');

    } catch (e) {
        console.error('❌ Full error:', e);
        console.error('\nError message:', e.message);
        console.error('SQL:', e.sql);
        console.error('Code:', e.code);
    }
    process.exit(0);
})();
