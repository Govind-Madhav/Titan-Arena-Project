require('dotenv').config();
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { sql } = require('drizzle-orm');

(async () => {
    try {
        // Get total count
        const result = await db.execute(sql`SELECT COUNT(*) as total FROM users`);
        const totalUsers = result[0][0].total;

        console.log('\n========================================');
        console.log('📊 USER DATABASE STATISTICS');
        console.log('========================================');
        console.log(`Total Users: ${totalUsers}`);
        console.log('========================================\n');

        // Get verified vs unverified breakdown
        const verifiedResult = await db.execute(sql`SELECT emailVerified, COUNT(*) as count FROM users GROUP BY emailVerified`);

        console.log('Breakdown by Email Verification:');
        verifiedResult[0].forEach(row => {
            const status = row.emailVerified ? '✅ Verified' : '❌ Unverified';
            console.log(`  ${status}: ${row.count}`);
        });
        console.log('\n');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
})();
