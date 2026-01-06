require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    let connection;
    try {
        console.log('🔍 Checking tables...');

        connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('🔌 Connected to:', connection.config.host);

        const [rows] = await connection.execute("SHOW TABLES");
        if (rows.length === 0) {
            console.log('✅ Database is EMPTY.');
        } else {
            console.log(`❌ Found ${rows.length} tables:`);
            rows.forEach(r => console.log(' - ' + Object.values(r)[0]));
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
})();
