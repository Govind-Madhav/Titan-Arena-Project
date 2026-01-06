require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    let connection;
    try {
        console.log('🔍 Checking UID counters table...');

        connection = await mysql.createConnection(process.env.DATABASE_URL);

        // Check if table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'uid_counters'");
        if (tables.length === 0) {
            console.error('❌ Table uid_counters DOES NOT EXIST!');
            process.exit(1);
        }
        console.log('✅ Table uid_counters exists.');

        // Select all rows
        const [rows] = await connection.execute("SELECT * FROM uid_counters");

        if (rows.length === 0) {
            console.error('❌ Table uid_counters is EMPTY!');
        } else {
            console.log('✅ Found rows:', rows);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
})();
