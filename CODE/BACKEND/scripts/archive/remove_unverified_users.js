require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    console.log('🗑️  Removing unverified users...\n');

    try {
        // Delete unverified users
        const result = await db.execute(sql`DELETE FROM users WHERE emailVerified = 0`);
        console.log(`✅ Removed ${result[0].affectedRows || 0} unverified user(s)`);

        console.log('\n📝 Database now only contains verified users.');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
})();
