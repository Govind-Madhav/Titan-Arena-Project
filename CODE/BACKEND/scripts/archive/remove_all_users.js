/**
 * Complete User Data Removal Script
 * Removes all users and their related data from both MySQL and Firebase Auth
 */

require('dotenv').config();
const { db, pool } = require('../src/db');
const { admin } = require('../src/config/firebase.config');
const { sql } = require('drizzle-orm');

async function removeAllUsers() {
    console.log('\n⚠️  ========================================');
    console.log('⚠️  COMPLETE USER DATA REMOVAL');
    console.log('⚠️  ========================================');
    console.log('This will delete:');
    console.log('  - All users from MySQL database');
    console.log('  - All user-related data (posts, teams, tournaments, etc.)');
    console.log('  - All Firebase Authentication users');
    console.log('========================================\n');

    try {
        // Step 1: Get user count before deletion
        const userCountResult = await db.execute(sql`SELECT COUNT(*) as total FROM users`);
        const totalUsers = userCountResult[0][0].total;
        console.log(`📊 Found ${totalUsers} users to remove\n`);

        if (totalUsers === 0) {
            console.log('✅ No users found. Database is already clean.\n');
            return;
        }

        // Step 2: Get all Firebase UIDs before deleting from MySQL
        console.log('🔍 Fetching Firebase UIDs...');
        const firebaseUidsResult = await db.execute(
            sql`SELECT firebase_uid FROM users WHERE firebase_uid IS NOT NULL`
        );
        const firebaseUids = firebaseUidsResult[0]
            .map(row => row.firebase_uid)
            .filter(uid => uid);
        console.log(`   Found ${firebaseUids.length} Firebase Auth users\n`);

        // Step 3: Disable foreign key checks for MySQL cleanup
        console.log('🔓 Disabling foreign key constraints...');
        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
        console.log('   ✅ Foreign key checks disabled\n');

        // Step 4: Delete from all user-related tables in correct order
        console.log('🗑️  Deleting user-related data...\n');

        const tablesToClean = [
            // Social & Posts
            'posts',

            // Disputes
            'dispute',

            // Matches & Tournaments
            'match',
            'registration',
            'tournament',

            // Teams
            'teammember',
            'team',

            // Host System
            'host_applications',
            'host_profiles',

            // Player Profiles
            'playergameprofile',
            'playerprofile',

            // Admin System
            'adminassignment',
            'auditlog',

            // Financial
            'transaction',
            'wallet',
            'kycrequest',

            // Auth & Notifications
            'notification',
            'refreshtoken',

            // Finally, users table
            'users'
        ];

        for (const tableName of tablesToClean) {
            try {
                console.log(`   Deleting from ${tableName}...`);
                const result = await db.execute(sql.raw(`DELETE FROM \`${tableName}\``));
                console.log(`   ✅ Cleared ${tableName}`);
            } catch (error) {
                if (error.code === 'ER_NO_SUCH_TABLE') {
                    console.log(`   ⚠️  Table ${tableName} does not exist, skipping`);
                } else {
                    console.error(`   ❌ Error deleting from ${tableName}:`, error.message);
                }
            }
        }

        // Step 5: Re-enable foreign key checks
        console.log('\n🔒 Re-enabling foreign key constraints...');
        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
        console.log('   ✅ Foreign key checks re-enabled\n');

        // Step 6: Delete users from Firebase Authentication
        if (firebaseUids.length > 0) {
            console.log('🔥 Removing users from Firebase Authentication...');
            let deletedCount = 0;
            let failedCount = 0;

            for (const uid of firebaseUids) {
                try {
                    await admin.auth().deleteUser(uid);
                    deletedCount++;
                    process.stdout.write(`\r   Progress: ${deletedCount}/${firebaseUids.length} users deleted`);
                } catch (error) {
                    failedCount++;
                    if (error.code !== 'auth/user-not-found') {
                        console.error(`\n   ⚠️  Failed to delete Firebase user ${uid}:`, error.message);
                    }
                }
            }
            console.log(`\n   ✅ Deleted ${deletedCount} Firebase Auth users`);
            if (failedCount > 0) {
                console.log(`   ⚠️  ${failedCount} users were already deleted or not found in Firebase`);
            }
        }

        // Step 7: Verify cleanup
        console.log('\n🔍 Verifying cleanup...');
        const finalCountResult = await db.execute(sql`SELECT COUNT(*) as total FROM users`);
        const finalCount = finalCountResult[0][0].total;

        if (finalCount === 0) {
            console.log('   ✅ Verification passed: 0 users remaining\n');
            console.log('========================================');
            console.log('✅ SUCCESS: All users and related data removed');
            console.log('========================================');
            console.log(`📊 Summary:`);
            console.log(`   - MySQL users removed: ${totalUsers}`);
            console.log(`   - Firebase Auth users removed: ${firebaseUids.length}`);
            console.log(`   - Database is now clean and ready for fresh users\n`);
        } else {
            console.log(`   ⚠️  Warning: ${finalCount} users still remain in database\n`);
        }

    } catch (error) {
        console.error('\n❌ Error during user removal:', error);

        // Try to re-enable foreign keys even if there's an error
        try {
            await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
        } catch (e) {
            // Ignore
        }

        process.exit(1);
    } finally {
        // Close connections
        await pool.end();
        console.log('🔌 Database connection closed\n');
    }
}

// Execute the cleanup
removeAllUsers();
