require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    console.log('🔍 Investigating database state...\n');

    try {
        // Check which user tables exist
        console.log('1️⃣ Checking user tables:');
        const tables = await db.execute(sql`SHOW TABLES`);
        const tableNames = tables[0].map(row => Object.values(row)[0]);
        const userTables = tableNames.filter(t => t.toLowerCase().includes('user'));
        console.log('   Tables with "user":', userTables);

        // Check wallet table structure
        console.log('\n2️⃣ Wallet table structure:');
        const walletDesc = await db.execute(sql`DESCRIBE wallet`);
        console.log('   Columns:', walletDesc[0].map(col => `${col.Field} (${col.Type}, ${col.Default || 'NO DEFAULT'})`));

        // Check wallet FK constraints
        console.log('\n3️⃣ Wallet foreign keys:');
        const fks = await db.execute(sql`
            SELECT 
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'wallet'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        console.log('   Foreign keys:', JSON.stringify(fks[0], null, 2));

        // Check if both user and users tables exist
        if (userTables.includes('user') && userTables.includes('users')) {
            console.log('\n⚠️  PROBLEM: Both "user" and "users" tables exist!');
            console.log('   This is causing FK confusion.');

            // Check which one has data
            const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM \`user\``);
            const usersCount = await db.execute(sql`SELECT COUNT(*) as count FROM \`users\``);
            console.log(`   - user table: ${userCount[0][0].count} rows`);
            console.log(`   - users table: ${usersCount[0][0].count} rows`);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
})();
