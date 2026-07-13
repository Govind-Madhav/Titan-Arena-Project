/**
 * Promote Titan to SUPERADMIN
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const uidService = require('../src/services/uid.service');

const run = async () => {
    try {
        const [titan] = await db.select().from(users).where(eq(users.username, 'Titan')).limit(1);
        if (!titan) {
            console.error('❌ User Titan not found');
            process.exit(1);
        }
        
        // Generate role UID for superadmin if not present
        const superAdminUid = titan.superAdminUid || (await uidService.generateRoleUid('SUPERADMIN', db)).uid;
        
        await db.update(users)
            .set({ 
                role: 'SUPERADMIN', 
                isAdmin: true,
                superAdminUid,
                updatedAt: new Date()
            })
            .where(eq(users.id, titan.id));
            
        console.log(`🎉 Promoted Titan to SUPERADMIN successfully with UID: ${superAdminUid}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Promotion failed:', err);
        process.exit(1);
    }
};

run();
