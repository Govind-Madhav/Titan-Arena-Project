require('dotenv').config({ override: true });
const { db } = require('./src/db');
const { sql } = require('drizzle-orm');

async function checkTables() {
    try {
        const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        const tables = result.rows ? result.rows.map(r => r.table_name) : result.map(r => r.table_name);
        console.log('Current Tables:', tables);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkTables();
