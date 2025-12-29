
require('dotenv').config();
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

async function promoteToSuperAdmin(email) {
    if (!email) {
        console.error('Please provide an email address.');
        process.exit(1);
    }

    console.log(`Searching for user with email: ${email}...`);

    try {
        const userList = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (userList.length === 0) {
            console.error('User not found!');
            process.exit(1);
        }

        const user = userList[0];
        console.log(`Found user: ${user.username} (ID: ${user.id}, Role: ${user.role})`);

        if (user.role === 'SUPERADMIN') {
            console.log('User is already a SUPERADMIN.');
            process.exit(0);
        }

        console.log('Promoting to SUPERADMIN...');
        await db.update(users)
            .set({ role: 'SUPERADMIN' })
            .where(eq(users.id, user.id));

        console.log('Successfully promoted user to SUPERADMIN!');
        process.exit(0);

    } catch (error) {
        console.error('Error promoting user:', error);
        process.exit(1);
    }
}

// Run the function with the hardcoded email or CLI arg
const targetEmail = process.argv[2] || 'govindmadhav003@gmail.com';
promoteToSuperAdmin(targetEmail);
