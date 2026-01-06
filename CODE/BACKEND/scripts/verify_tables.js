
const mysql = require('mysql2/promise');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

async function checkTables() {
    console.log('Connecting to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'FOUND' : 'MISSING');

    const connection = await mysql.createConnection(process.env.DATABASE_URL);

    try {
        const [rows] = await connection.execute('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        console.log('\nExisting Tables:');
        tables.forEach(t => console.log(`- ${t}`));

        const missing = ['host_applications', 'host_profiles'].filter(t => !tables.includes(t));

        if (missing.length > 0) {
            console.error(`\n❌ MISSING TABLES: ${missing.join(', ')}`);
        } else {
            console.log('\n✅ All Host tables are present.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkTables();
