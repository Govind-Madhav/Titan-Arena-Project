/**
 * Manually create a Firebase Auth user for an existing PostgreSQL user.
 * Usage: node scripts/create-firebase-user.js <email> <password>
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const { admin } = require('../src/config/firebase.config');

async function createFirebaseUser(email, password) {
    console.log(`\n🔥 Creating Firebase user for: ${email}\n`);

    // Find the user in PostgreSQL
    const result = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];

    if (!user) {
        console.error('❌ User not found in PostgreSQL. Make sure they registered first.');
        process.exit(1);
    }

    console.log(`Found PostgreSQL user: ${user.id}`);

    // Check if Firebase user already exists
    try {
        const existing = await admin.auth().getUserByEmail(email);
        console.log(`ℹ️ Firebase user already exists (uid: ${existing.uid}). Deleting and recreating...`);
        await admin.auth().deleteUser(existing.uid);
    } catch (e) {
        if (e.code !== 'auth/user-not-found') {
            console.warn('⚠️ Firebase check error:', e.message);
        }
    }

    // Create Firebase user with same UID as PostgreSQL user
    try {
        await admin.auth().createUser({
            uid: user.id,
            email: email,
            password: password,
            emailVerified: true
        });
        console.log(`✅ Firebase user created! UID: ${user.id}`);
        console.log('\n🎉 You can now login with Firebase! Try logging in on the frontend.\n');
    } catch (err) {
        console.error('❌ Failed to create Firebase user:', err.message);
    }

    process.exit(0);
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.error('Usage: node scripts/create-firebase-user.js <email> <password>');
    process.exit(1);
}

createFirebaseUser(email, password).catch(e => { console.error(e); process.exit(1); });
