require('dotenv').config();
const { db } = require('../../src/db');
const { users } = require('../../src/db/schema');
const { eq } = require('drizzle-orm');

const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address.');
    process.exit(1);
}

(async () => {
    try {
        console.log(`🔍 Looking for user: ${email}...`);

        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user || user.length === 0) {
            console.error('❌ User not found.');
            process.exit(1);
        }

        console.log(`✅ User found: ${user[0].username} (ID: ${user[0].id})`);

        await db.update(users)
            .set({
                isAdmin: true,
                role: 'SUPER_ADMIN'
            })
            .where(eq(users.email, email));

        console.log(`🚀 Success! ${user[0].username} is now a SUPER_ADMIN.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
