

require('dotenv').config({ override: true });
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function dropAllTables() {
    console.log('🔥 STARTING COMPLETE TABLE DROP 🔥\n');

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        console.log('DEBUG: DATABASE_URL loaded:', dbUrl.replace(/:[^:@]+@/, ':***@'));
    } else {
        console.error('DEBUG: DATABASE_URL is UNDEFINED!');
    }

    try {
        const [dbResult] = await db.execute(sql`SELECT DATABASE() as dbName`);
        const currentDb = dbResult[0].dbName;
        console.log(`🎯 Connected to Database: '${currentDb}'`);

        console.log('🔓 Disabling foreign key constraints...');
        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

        const [tables] = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        `);
        const tableNames = tables.map(row => row.TABLE_NAME || row.table_name);

        console.log(`Found ${tableNames.length} tables to drop in '${currentDb}'.\n`);

        // Hardcoded list of ALL possible table names (schema + variants)
        const allPossibleTables = [
            'uid_counters', 'user_counters', 'host_profiles', 'host_applications', 'posts',
            'users',
            'refreshToken', 'refreshtoken',
            'wallet',
            'transaction',
            'kycRequest',
            'team', 'teamMember',
            'tournament',
            'notification',
            'auditLog',
            'adminAssignment',
            'game',
            'registration',
            'match',
            'playerProfile', 'playerprofile',
            'playerGameProfile',
            'dispute',
            // Add Drizzle migrations table too
            '__drizzle_migrations'
        ];

        // Combine discovered + hardcoded, unique only
        const tablesToDrop = [...new Set([...tableNames, ...allPossibleTables])];

        for (const tableName of tablesToDrop) {
            console.log(`🗑️  Attempting DROP TABLE ${tableName}...`);
            await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${tableName}\``));
        }

        console.log('\n🔓 Re-enabling foreign key constraints...');
        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

        console.log('\n✅ ALL TABLES DROPPED. Database is clean.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error dropping tables:', error);
        process.exit(1);
    }
}

dropAllTables();
