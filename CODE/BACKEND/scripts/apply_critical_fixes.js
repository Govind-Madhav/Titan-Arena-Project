require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    console.log('🔧 Applying critical schema fixes...\n');

    try {
        // STEP 1: Rename user table to users (if not already done)
        console.log('1️⃣ Checking if user table needs to be renamed...');
        const tables = await db.execute(sql`SHOW TABLES LIKE 'user'`);
        if (tables[0].length > 0) {
            console.log('   Renaming user → users...');
            await db.execute(sql`RENAME TABLE \`user\` TO \`users\``);
            console.log('   ✅ Table renamed');
        } else {
            console.log('   ✅ Table already named "users"');
        }

        // STEP 2: Remove database-level defaults from wallet
        console.log('\n2️⃣ Removing database defaults from wallet table...');
        await db.execute(sql`
            ALTER TABLE wallet
            MODIFY COLUMN balance bigint NOT NULL,
            MODIFY COLUMN locked bigint NOT NULL,
            MODIFY COLUMN createdAt datetime NOT NULL,
            MODIFY COLUMN updatedAt datetime NOT NULL
        `);
        console.log('   ✅ Wallet defaults removed');

        // STEP 3: Remove defaults from users table (transactional fields)
        console.log('\n3️⃣ Removing defaults from users table...');
        await db.execute(sql`
            ALTER TABLE users
            MODIFY COLUMN isAdmin boolean NOT NULL,
            MODIFY COLUMN phoneVerified boolean NOT NULL,
            MODIFY COLUMN phoneVisibility varchar(20) NOT NULL,
            MODIFY COLUMN isBanned boolean NOT NULL,
            MODIFY COLUMN emailVerified boolean NOT NULL,
            MODIFY COLUMN registrationCompleted boolean NOT NULL,
            MODIFY COLUMN termsAccepted boolean NOT NULL,
            MODIFY COLUMN failedLoginCount int NOT NULL,
            MODIFY COLUMN createdAt datetime NOT NULL,
            MODIFY COLUMN updatedAt datetime NOT NULL
        `);
        console.log('   ✅ Users defaults removed');

        console.log('\n✅ All critical schema fixes applied successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Update schema.js to match (move users to top, remove .default())');
        console.log('   2. Test signup');

    } catch (e) {
        console.error('\n❌ Error:', e.message);
        console.error('Code:', e.code);
        console.error('SQL State:', e.sqlState);
    }
    process.exit(0);
})();
