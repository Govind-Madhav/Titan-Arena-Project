require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    let connection;
    try {
        console.log('☢️  NUKING DATABASE...');

        connection = await mysql.createConnection(process.env.DATABASE_URL);

        // Disable Foreign Key Checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        // Get all tables
        const [rows] = await connection.execute("SHOW TABLES");
        if (rows.length === 0) {
            console.log('Database is already empty.');
        } else {
            const tables = rows.map(row => Object.values(row)[0]);
            console.log(`Found ${tables.length} tables to drop:`, tables.join(', '));

            for (const table of tables) {
                await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
                console.log(`   🗑️  Dropped ${table}`);
            }
        }

        // Re-enable Foreign Key Checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n✅ Database completely wiped. Ready for clean db:push.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
})();
