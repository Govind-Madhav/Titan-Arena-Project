
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { sql } = require('drizzle-orm');

async function testConnection() {
    console.log('Testing DB connection and schema...');
    try {
        // limit 1
        const result = await db.select().from(users).limit(1);
        console.log('Successfully queried users table.');
        console.log('Columns found in result (if any rows):', result.length > 0 ? Object.keys(result[0]) : 'Table is empty, checking columns via empty insert/select...');

        // Try to select specific columns to check existence
        await db.select({
            username: users.username,
            platformUid: users.platformUid
        }).from(users).limit(1);

        console.log('SUCCESS: username and platformUid columns exist.');
        process.exit(0);
    } catch (error) {
        console.error('FAILURE: Database query failed.');
        console.error(error.message);
        process.exit(1);
    }
}

testConnection();
