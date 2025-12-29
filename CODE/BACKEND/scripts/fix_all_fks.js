require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

(async () => {
    console.log('🔍 Finding all FKs pointing to "user" table...\n');

    try {
        const fks = await db.execute(sql`
            SELECT 
                TABLE_NAME,
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME = 'user'
        `);

        console.log('Foreign keys pointing to "user":', JSON.stringify(fks[0], null, 2));

        if (fks[0].length > 0) {
            console.log('\n🔧 Fixing all FKs...\n');

            for (const fk of fks[0]) {
                console.log(`Fixing ${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME}...`);

                // Drop old FK
                await db.execute(sql.raw(`ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``));
                console.log(`  ✅ Dropped old FK`);

                // Add new FK pointing to users
                const newConstraintName = fk.CONSTRAINT_NAME.replace('_user_', '_users_');
                await db.execute(sql.raw(`
                    ALTER TABLE \`${fk.TABLE_NAME}\`
                    ADD CONSTRAINT \`${newConstraintName}\`
                    FOREIGN KEY (\`${fk.COLUMN_NAME}\`) REFERENCES users(id)
                    ON DELETE CASCADE
                `));
                console.log(`  ✅ Added new FK: ${newConstraintName}\n`);
            }

            // Now drop the user table
            console.log('Dropping "user" table...');
            await db.execute(sql`DROP TABLE \`user\``);
            console.log('✅ Old "user" table dropped\n');
        }

        // Remove wallet defaults
        console.log('Removing wallet defaults...');
        await db.execute(sql`
            ALTER TABLE wallet
            MODIFY COLUMN balance bigint NOT NULL,
            MODIFY COLUMN locked bigint NOT NULL,
            MODIFY COLUMN createdAt datetime NOT NULL,
            MODIFY COLUMN updatedAt datetime NOT NULL
        `);
        console.log('✅ Wallet defaults removed\n');

        console.log('🎯 All fixes complete! Signup should work now.');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
})();
