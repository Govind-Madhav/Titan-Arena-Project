require('dotenv').config();
const { db } = require('../../src/db');
const { users, playerProfiles } = require('../../src/db/schema');
const { eq } = require('drizzle-orm');

const email = process.argv[2];

if (!email) {
    console.log('Usage: node delete_user_by_email.js <email>');
    process.exit(1);
}

(async () => {
    try {
        // Find user
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user[0]) {
            console.log(`❌ No user found with email: ${email}`);
            process.exit(0);
        }

        console.log(`Found user: ${user[0].username} (${user[0].email})`);

        // Delete player profile first (if exists)
        await db.delete(playerProfiles).where(eq(playerProfiles.userId, user[0].id));
        console.log('✅ Deleted player profile');

        // Delete user
        await db.delete(users).where(eq(users.id, user[0].id));
        console.log('✅ Deleted user');

        console.log(`\n🎉 Successfully deleted user: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
