/**
 * Promote HawkeyeOG to HOST
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const uidService = require('../src/services/uid.service');

const run = async () => {
    try {
        const [user] = await db.select().from(users).where(eq(users.username, 'HawkeyeOG')).limit(1);
        if (!user) {
            console.error('❌ User HawkeyeOG not found');
            process.exit(1);
        }

        await db.transaction(async (tx) => {
            const hostUid = user.hostUid || (await uidService.generateRoleUid('HOST', tx)).uid;
            
            await tx.update(users)
                .set({
                    role: 'HOST',
                    hostStatus: 'VERIFIED',
                    hostUid,
                    updatedAt: new Date()
                })
                .where(eq(users.id, user.id));

            console.log(`🎉 Promoted HawkeyeOG to HOST successfully with Host UID: ${hostUid}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    }
};
run();
