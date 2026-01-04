require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    try {
        const tables = await db.execute(sql`SHOW TABLES LIKE 'user'`);
        console.log('Tables matching "user":', JSON.stringify(tables[0], null, 2));

        const allTables = await db.execute(sql`SHOW TABLES`);
        const tableNames = allTables[0].map(row => Object.values(row)[0]);
        console.log('\nAll tables:', tableNames.filter(t => t.toLowerCase().includes('user')));

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
})();
