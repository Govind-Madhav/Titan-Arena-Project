
const { db } = require('../src/db');
const { users } = require('../src/db/schema');

const listUsers = async () => {
    try {
        console.log('Fetching users...');
        const allUsers = await db.select().from(users);

        if (allUsers.length === 0) {
            console.log('No users found in database.');
        } else {
            console.log('\n--- Registered Users ---');
            allUsers.forEach(u => {
                console.log(`- Username: ${u.username} | Email: ${u.email} | Role: ${u.role} | UID: ${u.platformUid}`);
            });
            console.log('------------------------\n');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

listUsers();
