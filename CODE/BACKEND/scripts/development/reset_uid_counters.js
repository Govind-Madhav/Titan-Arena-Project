require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    let connection;
    try {
        console.log('🔧 Re-Initializing UID counters (Backticks)...');

        connection = await mysql.createConnection(process.env.DATABASE_URL);

        // 1. DROP Table
        await connection.execute(`DROP TABLE IF EXISTS \`uid_counters\``);
        console.log('✅ Dropped old uid_counters table');

        // 2. Create Table
        await connection.execute(`
            CREATE TABLE \`uid_counters\` (
                \`region\` INT PRIMARY KEY,
                \`last_value\` BIGINT NOT NULL DEFAULT 0,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created new uid_counters table');

        // 3. Insert Regions 1-6
        for (let i = 1; i <= 6; i++) {
            await connection.execute(`
                INSERT INTO \`uid_counters\` (\`region\`, \`last_value\`) 
                VALUES (?, 0)
            `, [i]);
            console.log(`   Region ${i} initialized`);
        }

        console.log('\n✅ UID Counters successfully reset!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
})();
