
require('dotenv').config({ override: true });
const { db, pool } = require('../src/db');
const { migrate } = require('drizzle-orm/mysql2/migrator');

async function runMigrations() {
    console.log('🚀 Starting Database Migration...');
    console.log('📦 Reading migrations from ./drizzle');

    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('✅ Migrations applied successfully!');

        // Close connection
        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);

        // Detailed error logging
        if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);

        process.exit(1);
    }
}

runMigrations();
