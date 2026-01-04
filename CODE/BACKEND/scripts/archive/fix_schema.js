require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    try {
        console.log('Renaming user table to users...');
        await db.execute(sql`RENAME TABLE \`user\` TO \`users\``);
        console.log('✅ Table renamed successfully');

        console.log('\nRemoving defaults from wallet columns...');
        await db.execute(sql`ALTER TABLE wallet MODIFY COLUMN balance bigint NOT NULL`);
        await db.execute(sql`ALTER TABLE wallet MODIFY COLUMN locked bigint NOT NULL`);
        await db.execute(sql`ALTER TABLE wallet MODIFY COLUMN createdAt datetime NOT NULL`);
        await db.execute(sql`ALTER TABLE wallet MODIFY COLUMN updatedAt datetime NOT NULL`);
        console.log('✅ Wallet schema updated');

        console.log('\n✅ All schema fixes applied successfully!');
    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error('Code:', e.code);
    }
    process.exit(0);
})();
