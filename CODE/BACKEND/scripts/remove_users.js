require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    console.log('🗑️  Removing all users...\n');

    try {
        // Delete all users (cascade will handle related records)
        const result = await db.execute(sql`DELETE FROM users`);
        console.log('✅ All users removed successfully!');
        console.log(`   Deleted ${result[0].affectedRows || 0} user(s)`);

        console.log('\n📝 You can now test signup with a fresh account.');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
})();
