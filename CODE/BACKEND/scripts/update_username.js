
require('dotenv').config();
const { db } = require('../src/db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

async function updateUsername(email, newUsername) {
    console.log(`Updating username for ${email} to "${newUsername}"...`);

    try {
        const userList = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (userList.length === 0) {
            console.error('User not found!');
            process.exit(1);
        }

        const user = userList[0];
        console.log(`Found user: ${user.username} (ID: ${user.id})`);

        if (user.username === newUsername) {
            console.log('Username is already set to the target value.');
            process.exit(0);
        }

        console.log(`Updating username from "${user.username}" to "${newUsername}"...`);
        await db.update(users)
            .set({ username: newUsername })
            .where(eq(users.id, user.id));

        console.log('✅ Successfully updated username!');
        process.exit(0);

    } catch (error) {
        console.error('Error updating username:', error);
        process.exit(1);
    }
}

// Run the function
updateUsername('govindmadhav003@gmail.com', 'Hawkeye-OG');
