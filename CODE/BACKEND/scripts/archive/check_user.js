
require('dotenv').config({ override: true });
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function checkUser() {
    console.log('🔍 Checking for existing users...');

    const username = 'Hawkeye-OG';
    const email = 'govindmadhav003@gmail.com';

    try {
        const [users] = await db.execute(sql`
            SELECT id, username, email, platformUid 
            FROM users 
            WHERE username = ${username} OR email = ${email}
        `);

        if (users.length > 0) {
            console.log('⚠️  Found existing users:');
            console.log(JSON.stringify(users, null, 2));
        } else {
            console.log('✅ No conflicting users found (checking username/email).');
        }

        // Check Platform UID specifically
        const uid = 'IN-2025-0002';
        const [uidUsers] = await db.execute(sql`SELECT * FROM users WHERE platformUid=${uid}`);
        if (uidUsers.length > 0) {
            console.log(`⚠️  Found collision on UID ${uid}:`, JSON.stringify(uidUsers, null, 2));
        }

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

checkUser();
