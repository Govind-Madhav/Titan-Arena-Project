require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    let connection;
    try {
        console.log('🔧 Initializing UID counters (Direct MySQL via DATABASE_URL)...');

        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not set in environment variables');
        }

        connection = await mysql.createConnection(process.env.DATABASE_URL);

        // 1. Create Table (with backticks for safety)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`uid_counters\` (
                \`region\` INT PRIMARY KEY,
                \`last_value\` BIGINT NOT NULL DEFAULT 0
            )
        `);
        console.log('✅ Table uid_counters passed');

        // 2. Insert Regions 1-6
        for (let i = 1; i <= 6; i++) {
            await connection.execute(`
                INSERT IGNORE INTO \`uid_counters\` (\`region\`, \`last_value\`) 
                VALUES (?, 0)
            `, [i]);
            console.log(`   Region ${i} verified`);
        }

        console.log('\n✅ All counters ready!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
})();
