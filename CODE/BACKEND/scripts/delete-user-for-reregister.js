/**
 * Cleanup script: deletes a user from PostgreSQL + Firebase so they can re-register.
 * Usage: node scripts/delete-user-for-reregister.js <email>
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users, wallets, playerProfiles, refreshTokens } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const { admin } = require('../src/config/firebase.config');

async function deleteUser(email) {
    console.log(`\n🧹 Cleaning up user: ${email}\n`);

    // Find the user in PostgreSQL
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];

    if (!user) {
        console.log('✅ No PostgreSQL user found — safe to re-register!');
    } else {
        console.log(`Found PostgreSQL user: ${user.id}`);

        // Delete in order (FK constraints)
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
        await db.delete(playerProfiles).where(eq(playerProfiles.userId, user.id));
        await db.delete(wallets).where(eq(wallets.userId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
        console.log('✅ PostgreSQL user and all related data deleted');

        // Also delete Firebase user if it exists
        try {
            const fbUser = await admin.auth().getUserByEmail(email);
            await admin.auth().deleteUser(fbUser.uid);
            console.log('✅ Firebase user deleted');
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log('ℹ️  No Firebase user found (expected if registration was incomplete)');
            } else {
                console.warn('⚠️  Firebase delete error:', e.message);
            }
        }
    }

    console.log('\n🎉 Done! You can now re-register with this email.\n');
    process.exit(0);
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: node scripts/delete-user-for-reregister.js <email>');
    process.exit(1);
}

deleteUser(email).catch(e => { console.error(e); process.exit(1); });
