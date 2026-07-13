require('dotenv').config();
const { db } = require('../../src/db');
const { users } = require('../../src/db/schema');
const { eq, asc } = require('drizzle-orm');
const uidService = require('../../src/services/uid.service');

const ROLE_CONFIGS = [
    { role: 'HOST', field: 'hostUid' },
    { role: 'ADMIN', field: 'adminUid' },
    { role: 'SUPERADMIN', field: 'superAdminUid' }
];

async function backfillRoleUids() {
    console.log('🔧 Backfilling role-specific UIDs...');

    try {
        await db.transaction(async (tx) => {
            for (const config of ROLE_CONFIGS) {
                const rows = await tx.select({
                    id: users.id,
                    username: users.username,
                    email: users.email,
                    role: users.role,
                    hostUid: users.hostUid,
                    adminUid: users.adminUid,
                    superAdminUid: users.superAdminUid,
                    createdAt: users.createdAt
                })
                    .from(users)
                    .where(eq(users.role, config.role))
                    .orderBy(asc(users.createdAt));

                const missingRows = rows.filter((row) => !row[config.field]);

                console.log(`\n${config.role}: ${rows.length} found, ${missingRows.length} missing ${config.field}`);

                for (const row of missingRows) {
                    const { uid } = await uidService.generateRoleUid(config.role, tx);

                    await tx.update(users)
                        .set({ [config.field]: uid })
                        .where(eq(users.id, row.id));

                    console.log(`✓ ${config.role} ${row.username || row.email} -> ${uid}`);
                }
            }
        });

        console.log('\n✅ Role UID backfill completed successfully.');
    } catch (error) {
        console.error('❌ Role UID backfill failed:', error);
        process.exit(1);
    }
}

backfillRoleUids();