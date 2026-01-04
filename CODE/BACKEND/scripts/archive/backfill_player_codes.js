
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq, asc, isNull } = require('drizzle-orm');
const uidService = require('../src/services/uid.service');

const backfill = async () => {
    try {
        console.log('🚀 Starting Player Code Backfill...');

        // 1. Fetch Users without player_code ordered by creation date
        const usersToBackfill = await db.select()
            .from(users)
            .where(isNull(users.playerCode))
            .orderBy(asc(users.createdAt));

        console.log(`📊 Found ${usersToBackfill.length} users to backfill.`);

        let count = 0;

        // 2. Process one by one in transaction
        // Important: We do this inside ONE transaction per user or one BIG transaction?
        // One per user is safer for long running (though we only have 1 user here).
        // Let's do one by one.

        for (const user of usersToBackfill) {
            await db.transaction(async (tx) => {
                const code = await uidService.generatePlayerCode(tx);
                await tx.update(users)
                    .set({ playerCode: code })
                    .where(eq(users.id, user.id));
                console.log(`✅ Assigned ${code} to ${user.username}`);
            });
            count++;
        }

        console.log(`✨ Backfill Complete! Updated ${count} users.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Backfill Failed:', error);
        process.exit(1);
    }
};

backfill();
