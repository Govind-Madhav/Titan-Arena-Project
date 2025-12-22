const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function checkTables() {
    try {
        const result = await db.execute(sql`SHOW TABLES`);
        console.log('Current Tables:', result[0].map(r => Object.values(r)[0]));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkTables();
