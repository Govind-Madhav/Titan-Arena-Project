require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    try {
        const users = await db.execute(sql`SELECT id, username, email, emailVerified FROM users`);
        console.log('Current users:', JSON.stringify(users[0], null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
})();
