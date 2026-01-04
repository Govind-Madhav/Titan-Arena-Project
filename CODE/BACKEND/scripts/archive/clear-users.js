const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { db } = require('../src/db');
const { users, refreshTokens, wallets } = require('../src/db/schema');
const { sql } = require('drizzle-orm');

async function clearUsers() {
    console.log('🗑️ Clearing/Dropping ALL tables for fresh schema...');
    try {
        await db.execute(sql.raw('SET FOREIGN_KEY_CHECKS = 0'));

        const tables = [
            'wallet', 'user', 'uid_counters', 'refreshToken',
            'transaction', 'kycRequest', 'team', 'teamMember',
            'tournament', 'notification', 'auditLog', 'game',
            'registration', 'match',
            // Legacy/Typo names just in case
            'wallets', 'users', 'refreshtoken', 'kycrequest', 'teammember', 'auditlog'
        ];

        for (const t of tables) {
            await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${t}\``));
        }

        await db.execute(sql.raw('SET FOREIGN_KEY_CHECKS = 1'));

        console.log('✅ Dropped ALL tables. Ready for fresh migration.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to clear tables:', error);
        process.exit(1);
    }
}

clearUsers();
