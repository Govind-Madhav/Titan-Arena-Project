
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function run() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('Connected to DB');

    const queries = [
        "ALTER TABLE wallet ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';",
        "ALTER TABLE users ADD COLUMN media_visibility VARCHAR(20) DEFAULT 'public';",
        "ALTER TABLE users ADD COLUMN billing_address JSON;",
        "ALTER TABLE users ADD COLUMN invoice_email VARCHAR(191);",
        "ALTER TABLE users ADD COLUMN deactivated_at DATETIME;",
        "ALTER TABLE users ADD COLUMN username_change_count INT DEFAULT 0;",
        `CREATE TABLE IF NOT EXISTS blocked_users (
            blocker_id VARCHAR(191) NOT NULL,
            blocked_id VARCHAR(191) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (blocker_id, blocked_id),
            FOREIGN KEY (blocker_id) REFERENCES users(id),
            FOREIGN KEY (blocked_id) REFERENCES users(id)
        );`,
        "ALTER TABLE refreshtoken ADD COLUMN user_agent VARCHAR(255);",
        "ALTER TABLE refreshtoken ADD COLUMN ip_address VARCHAR(45);"
    ];

    for (const q of queries) {
        try {
            await connection.query(q);
            console.log(`✅ Success: ${q.substring(0, 50)}...`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(`⚠️ Exists: ${q.substring(0, 50)}...`);
            } else {
                console.log(`❌ Error: ${q.substring(0, 50)}... -> ${e.message}`);
                // Continue despite error
            }
        }
    }

    await connection.end();
}

run().catch(console.error);
