require('dotenv').config({ override: true });
const path = require('path');
const { db } = require(path.join(__dirname, '../src/db'));
const { users } = require(path.join(__dirname, '../src/db/schema'));

const { sql } = require('drizzle-orm');

async function cleanup() {
    try {
        console.log('🧹 Cleaning up database (disabling FK checks)...');
        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
        await db.delete(users);
        // Also cleanup dependent tables to be thorough
        const { wallets, refreshTokens, playerProfiles } = require(path.join(__dirname, '../src/db/schema'));
        await db.delete(wallets);
        await db.delete(refreshTokens);
        await db.delete(playerProfiles);

        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
        console.log('✅ All users and dependent data removed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
