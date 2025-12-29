
const { db } = require('../src/db');
const { users } = require('../src/db/schema');

const checkUsers = async () => {
    try {
        console.log('🔍 Checking registered users...');
        const allUsers = await db.select().from(users);
        if (allUsers.length === 0) {
            console.log('❌ No users found.');
        } else {
            console.log(JSON.stringify(allUsers, null, 2));
        }
        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
};

checkUsers();
