
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

const applySchema = async () => {
    try {
        console.log('🚀 Applying Phase 1 Final Schema Changes...');

        // 1. Create host_applications
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS \`host_applications\` (
                \`id\` varchar(191) NOT NULL PRIMARY KEY,
                \`user_id\` varchar(191) NOT NULL,
                \`status\` enum('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
                \`documents_url\` varchar(500),
                \`notes\` text,
                \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
                \`reviewed_at\` timestamp NULL,
                \`reviewed_by\` varchar(191),
                FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created table: host_applications');

        // 2. Create posts
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS \`posts\` (
                \`id\` varchar(191) NOT NULL PRIMARY KEY,
                \`user_id\` varchar(191) NOT NULL,
                \`content\` text NOT NULL,
                \`type\` enum('GENERAL', 'ACHIEVEMENT', 'TOURNAMENT_UPDATE') NOT NULL DEFAULT 'GENERAL',
                \`media_url\` varchar(500),
                \`likes_count\` int DEFAULT 0,
                \`is_deleted\` boolean DEFAULT false,
                \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created table: posts');

        console.log('✨ Schema Update Complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema Update Failed:', error);
        process.exit(1);
    }
};

applySchema();
