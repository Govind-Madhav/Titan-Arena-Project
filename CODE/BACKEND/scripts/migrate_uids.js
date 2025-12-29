
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq, like } = require('drizzle-orm');

const migrateUIDs = async () => {
    try {
        console.log('🚀 Starting UID Migration...');

        // Verify connection
        const allUsers = await db.select().from(users);
        console.log(`📊 Found ${allUsers.length} total users.`);

        const usersToMigrate = allUsers.filter(u => u.platformUid && u.platformUid.includes('-'));
        console.log(`🔄 Found ${usersToMigrate.length} users with old UID format.`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const user of usersToMigrate) {
            try {
                // Old Format: CC-RR-YY-SSSS (e.g., 91-01-25-0001)
                // New Format: YYRRCCSSSS    (e.g., 2501910001)

                const parts = user.platformUid.split('-');
                if (parts.length !== 4) {
                    console.warn(`⚠️  Skipping invalid format UID for user ${user.username}: ${user.platformUid}`);
                    continue;
                }

                const [cc, rr, yy, ssss] = parts;
                const newUid = `${yy}${rr}${cc}${ssss}`;

                console.log(`📝 Migrating ${user.username}: ${user.platformUid} -> ${newUid}`);

                await db.update(users)
                    .set({ platformUid: newUid })
                    .where(eq(users.id, user.id));

                updatedCount++;
            } catch (err) {
                console.error(`❌ Failed to update user ${user.username}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n✅ Migration Complete');
        console.log(`✨ Updated: ${updatedCount}`);
        console.log(`⚠️  Errors: ${errorCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Critical Failure:', error);
        process.exit(1);
    }
};

migrateUIDs();
