
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

const applySchema = async () => {
    try {
        console.log('🚀 Applying Schema Changes...');

        // 1. Create user_counters
        console.log('Creating user_counters...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS \`user_counters\` (
                \`key\` varchar(20) NOT NULL,
                \`last_number\` int NOT NULL DEFAULT 0,
                PRIMARY KEY (\`key\`)
            ) ENGINE=InnoDB;
        `);

        // 2. Seed counters
        console.log('Seeding counters...');
        await db.execute(sql`
            INSERT IGNORE INTO \`user_counters\` (\`key\`, \`last_number\`) VALUES
            ('PLAYER_CODE', 0),
            ('HOST_CODE', 0),
            ('ADMIN_CODE', 0);
        `);

        // 3. Create host_profiles
        console.log('Creating host_profiles...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS \`host_profiles\` (
                \`id\` varchar(191) NOT NULL,
                \`user_id\` varchar(191) NOT NULL,
                \`host_code\` varchar(20) NOT NULL,
                \`status\` enum('PENDING','ACTIVE','SUSPENDED','REVOKED') NOT NULL DEFAULT 'PENDING',
                \`verified_at\` timestamp NULL DEFAULT NULL,
                \`verified_by\` varchar(191) DEFAULT NULL,
                \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`user_id\` (\`user_id\`),
                UNIQUE KEY \`host_code\` (\`host_code\`)
            ) ENGINE=InnoDB;
        `);

        // 4. Alter users table
        console.log('Altering users table...');

        // Check if columns exist first (Basic check or just try ADD IGNORE equivalent)
        // MySQL doesn't have IF NOT EXISTS for columns in ALTER easily, so we try/catch blocks or specific naming

        try {
            await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`player_code\` varchar(20) UNIQUE;`);
            console.log('✅ Added player_code');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ player_code already exists');
            else console.error('Error adding player_code:', e.message);
        }

        try {
            await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`is_admin\` boolean DEFAULT false;`);
            console.log('✅ Added is_admin');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ is_admin already exists');
            else console.error('Error adding is_admin:', e.message);
        }

        console.log('✨ Schema changes applied successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema Update Failed:', error);
        process.exit(1);
    }
};

applySchema();
