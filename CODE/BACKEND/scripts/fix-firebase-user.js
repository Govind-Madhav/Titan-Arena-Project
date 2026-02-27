/**
 * Self-contained script to create a Firebase user for admin account.
 * No dependency on server modules — directly initializes Firebase Admin.
 */
require('dotenv').config();
const admin = require('firebase-admin');
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const path = require('path');

// Initialize Firebase Admin directly
const serviceAccountPath = path.join(__dirname, '../Firebase/e-sports-tournament-ba4c6-firebase-adminsdk-fbsvc-dc828d7473.json');
admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
});

async function run(email, password) {
    console.log(`\n🔥 Creating Firebase Auth user for: ${email}\n`);

    // Get the user's PostgreSQL UUID to use as Firebase UID
    const result = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];

    if (!user) {
        console.error('❌ No user found in PostgreSQL with that email.');
        process.exit(1);
    }
    console.log(`✅ Found PostgreSQL user: ${user.id}`);

    // Delete existing Firebase user if any
    try {
        const existing = await admin.auth().getUserByEmail(email);
        console.log('⚠️  Deleting existing Firebase user...');
        await admin.auth().deleteUser(existing.uid);
    } catch (e) {
        if (e.code !== 'auth/user-not-found') console.log('ℹ️  No existing Firebase user.');
    }

    // Create Firebase user
    await admin.auth().createUser({
        uid: user.id,
        email,
        password,
        emailVerified: true
    });

    console.log(`\n✅ Firebase user created successfully!`);
    console.log(`   UID: ${user.id}`);
    console.log(`   Email: ${email}`);
    console.log('\n🎉 Login should now work on the frontend!\n');
    process.exit(0);
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.error('Usage: node scripts/fix-firebase-user.js <email> <password>');
    process.exit(1);
}

run(email, password).catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
