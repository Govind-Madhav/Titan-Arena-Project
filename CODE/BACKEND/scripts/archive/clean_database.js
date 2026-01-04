
require('dotenv').config();
const { db } = require('../src/db');

async function cleanDatabase() {
    console.log('🧹 Starting complete database wipe...\n');

    try {
        // Disable foreign key checks
        console.log('🔓 Disabling foreign key constraints...');
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        console.log('   ✅ Foreign key checks disabled\n');

        // Get list of all tables
        const [tables] = await db.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        console.log(`Found ${tableNames.length} tables in database\n`);

        // Delete from all tables except migrations
        for (const tableName of tableNames) {
            if (tableName !== '__drizzle_migrations') {
                console.log(`🗑️  Deleting from ${tableName}...`);
                await db.execute(`DELETE FROM \`${tableName}\``);
                console.log(`   ✅ Cleared ${tableName}`);
            }
        }

        // Re-enable foreign key checks
        console.log('\n🔒 Re-enabling foreign key constraints...');
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('   ✅ Foreign key checks re-enabled');

        console.log('\n✅ Complete database wipe successful!');
        console.log('   All data has been removed. Database is now empty.');
        console.log('   You can now create a fresh account.\n');

        process.exit(0);

    } catch (error) {
        // Make sure to re-enable foreign keys even if there's an error
        try {
            await db.execute('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {
            // Ignore
        }
        console.error('\n❌ Error during cleanup:', error);
        process.exit(1);
    }
}

console.log('⚠️  WARNING: This will DELETE EVERYTHING from the database!');
console.log('   - ALL users (including your account)');
console.log('   - ALL matches (including example data)');
console.log('   - ALL teams, posts, notifications, transactions');
console.log('   - Complete database reset\n');

cleanDatabase();
