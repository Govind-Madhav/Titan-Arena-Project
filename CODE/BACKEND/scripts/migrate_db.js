
const { db } = require('../src/db');
const fs = require('fs');
const path = require('path');
const { sql } = require('drizzle-orm');

async function runMigration() {
    console.log('🚀 Starting manual migration...');
    const migrationPath = path.join(__dirname, '../drizzle/0000_wooden_serpent_society.sql');

    try {
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        const statements = sqlContent.split('--> statement-breakpoint')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} statements to execute.`);

        for (const statement of statements) {
            try {
                // Execute raw SQL using db.execute(sql.raw())
                await db.execute(sql.raw(statement));
                console.log('✅ Executed statement.');
            } catch (err) {
                // Ignore "Table already exists" or "Duplicate column" errors to make it idempotent-ish
                if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME') {
                    console.log('⚠️  Skipping existing table/column.');
                } else {
                    console.error('❌ Error executing statement:', err.message);
                    // Don't exit, try next
                }
            }
        }

        console.log('✅ Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
