require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    console.log('🔧 Fixing database issues...\n');

    try {
        // STEP 1: Drop the old FK constraint
        console.log('1️⃣ Dropping old FK constraint pointing to "user" table...');
        await db.execute(sql`ALTER TABLE wallet DROP FOREIGN KEY wallet_userId_user_id_fk`);
        console.log('   ✅ Old FK dropped');

        // STEP 2: Drop the old "user" table (it's empty)
        console.log('\n2️⃣ Dropping empty "user" table...');
        await db.execute(sql`DROP TABLE \`user\``);
        console.log('   ✅ Old table dropped');

        // STEP 3: Add new FK constraint pointing to "users" table
        console.log('\n3️⃣ Adding new FK constraint to "users" table...');
        await db.execute(sql`
            ALTER TABLE wallet
            ADD CONSTRAINT wallet_userId_users_id_fk
            FOREIGN KEY (userId) REFERENCES users(id)
            ON DELETE CASCADE
        `);
        console.log('   ✅ New FK added');

        // STEP 4: Remove database-level defaults from wallet
        console.log('\n4️⃣ Removing database defaults from wallet...');
        await db.execute(sql`
            ALTER TABLE wallet
            MODIFY COLUMN balance bigint NOT NULL,
            MODIFY COLUMN locked bigint NOT NULL,
            MODIFY COLUMN createdAt datetime NOT NULL,
            MODIFY COLUMN updatedAt datetime NOT NULL
        `);
        console.log('   ✅ Defaults removed');

        console.log('\n✅ All fixes applied successfully!');
        console.log('\n📝 Summary:');
        console.log('   - Dropped old "user" table');
        console.log('   - Fixed wallet FK to point to "users"');
        console.log('   - Removed all database-level defaults from wallet');
        console.log('\n🎯 Signup should now work!');

    } catch (e) {
        console.error('\n❌ Error:', e.message);
        console.error('Code:', e.code);
    }
    process.exit(0);
})();
