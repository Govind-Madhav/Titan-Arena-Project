/**
 * Reset Titan password to Admin@1234
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcryptjs');

const run = async () => {
    try {
        const [titan] = await db.select().from(users).where(eq(users.username, 'Titan')).limit(1);
        if (!titan) {
            console.error('❌ User Titan not found');
            process.exit(1);
        }

        const hash = await bcrypt.hash('Admin@1234', 12);
        await db.update(users)
            .set({ 
                passwordHash: hash,
                updatedAt: new Date()
            })
            .where(eq(users.id, titan.id));

        console.log('🎉 Titan password updated to Admin@1234 successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    }
};

run();
