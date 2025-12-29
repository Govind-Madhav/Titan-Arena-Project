
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function patchSchema() {
    console.log('🔧 Patching database schema...');
    try {
        // Add phoneVisibility to users
        try {
            await db.execute(sql.raw("ALTER TABLE `user` ADD COLUMN `phoneVisibility` varchar(20) NOT NULL DEFAULT 'private'"));
            console.log('✅ Added phoneVisibility column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ phoneVisibility already exists.');
            else throw e;
        }

        console.log('✅ Schema patch completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Patch failed:', error);
        process.exit(1);
    }
}

patchSchema();
