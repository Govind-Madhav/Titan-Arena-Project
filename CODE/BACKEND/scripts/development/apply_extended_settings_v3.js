
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SQL_FILE = path.join(__dirname, '../../migrations/extended_settings_v3.sql');

async function applyMigration() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not defined');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        const connection = await mysql.createConnection(process.env.DATABASE_URL);

        console.log('Reading migration file...');
        const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');

        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} statements to execute.`);

        for (const statement of statements) {
            console.log(`Executing: ${statement}...`);
            try {
                await connection.query(statement);
                console.log('✅ Success');
            } catch (err) {
                // Ignore "Duplicate column name" error (1060)
                if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
                    console.log('⚠️ Column already exists, skipping.');
                } else {
                    console.error('❌ Failed:', err.message);
                }
            }
        }

        await connection.end();
        console.log('Migration completed.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

applyMigration();
