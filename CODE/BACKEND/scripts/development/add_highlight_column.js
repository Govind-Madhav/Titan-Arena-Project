require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, 'add_highlight_url.sql');

(async () => {
    let connection;
    try {
        console.log('🚧 Adding highlightUrl column to tournaments table...');

        if (!fs.existsSync(SQL_FILE)) {
            console.error('❌ SQL file not found:', SQL_FILE);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(SQL_FILE, 'utf-8');

        connection = await mysql.createConnection({
            uri: process.env.DATABASE_URL
        });

        await connection.execute(sqlContent);

        console.log('✅ highlightUrl column added successfully!');
        process.exit(0);

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  Column already exists, skipping...');
            process.exit(0);
        }
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
})();
