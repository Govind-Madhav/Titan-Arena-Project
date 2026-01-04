/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

require('dotenv').config({ path: '../.env' });
const { db, pool } = require('../src/db');
const {
    users,
    refreshTokens,
    wallets,
    transactions,
    kycRequests,
    teams,
    teamMembers,
    tournaments,
    notifications,
    registrations,
    matches
} = require('../src/db/schema');

async function safeDelete(tableName, tableObj) {
    try {
        console.log(`Deleting ${tableName}...`);
        await db.delete(tableObj);
        console.log(`✓ Deleted ${tableName}`);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log(`⚠️  Table ${tableName} does not exist, skipping.`);
        } else {
            console.error(`❌ Error deleting ${tableName}:`, error.message);
            // Verify if we should stop. For now, let's log and continue if possible, 
            // but foreign key errors might require stopping.
            // If it is a foreign key constraint error, we must fix the order.
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw error;
            }
        }
    }
}

async function clearAllUsers() {
    console.log('🗑️  Starting cleanup process...');

    try {
        // Delete in order to satisfy foreign key constraints
        // Order: matches -> registrations -> teamMembers -> teams -> tournaments -> transactions -> wallets -> refreshTokens -> kycRequests -> notifications -> users

        await safeDelete('matches', matches);
        await safeDelete('registrations', registrations);
        await safeDelete('teamMembers', teamMembers);
        await safeDelete('teams', teams);
        await safeDelete('tournaments', tournaments);
        await safeDelete('transactions', transactions);
        await safeDelete('wallets', wallets);
        await safeDelete('refreshTokens', refreshTokens);
        await safeDelete('kycRequests', kycRequests);
        await safeDelete('notifications', notifications);
        await safeDelete('users', users);

        console.log('✅ Successfully removed all users and related data.');

    } catch (error) {
        console.error('❌ Error clearing users:', error);
    } finally {
        // Close the connection
        await pool.end();
        console.log('🔌 Disconnected');
    }
}

clearAllUsers();
