require('dotenv').config();
const { db } = require('../../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    try {
        console.log('🔧 Initializing UID counters (Simplified)...');

        // 1. Create Table (Simplified schema)
        await db.execute(sql.raw(`
            CREATE TABLE IF NOT EXISTS uid_counters (
                region INT PRIMARY KEY,
                last_value BIGINT NOT NULL DEFAULT 0
            )
        `));
        console.log('✅ Table uid_counters passed');

        // 2. Insert Regions 1-6
        for (let i = 1; i <= 6; i++) {
            await db.execute(sql.raw(`
                INSERT IGNORE INTO uid_counters (region, last_value) 
                VALUES (${i}, 0)
            `));
            console.log(`   Region ${i} verified`);
        }

        console.log('\n✅ All counters ready!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
