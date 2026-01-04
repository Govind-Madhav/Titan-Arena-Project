/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

require('dotenv').config({ path: '../.env' });
const { pool } = require('../src/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createOrUpdateUser(userData, walletBalance) {
    try {
        const { email, password, username, role } = userData;

        console.log(`Processing ${role} (${email})...`);
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if exists
        const [rows] = await pool.execute('SELECT id FROM user WHERE email = ?', [email]);

        if (rows.length > 0) {
            console.log(`User ${email} already exists, updating...`);
            await pool.execute(
                'UPDATE user SET role = ?, password = ?, emailVerified = 1, isBanned = 0 WHERE email = ?',
                [role, hashedPassword, email]
            );
            console.log(`✓ Updated ${email}`);
        } else {
            console.log(`Creating new ${role}...`);
            const userId = crypto.randomUUID();
            const walletId = crypto.randomUUID();

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Insert User (Only core fields)
                await connection.execute(
                    'INSERT INTO user (id, email, username, password, role, emailVerified, hostStatus, isBanned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [userId, email, username, hashedPassword, role, 1, 'VERIFIED', 0]
                );

                // Insert Wallet
                await connection.execute(
                    'INSERT INTO wallet (id, userId, balance, locked) VALUES (?, ?, ?, ?)',
                    [walletId, userId, walletBalance, 0]
                );

                await connection.commit();
                console.log(`✓ Created ${email}`);
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        }
    } catch (error) {
        console.error(`❌ Error processing ${userData.email}:`, error);
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            console.log("Detailed Schema Error:", error.sqlMessage);
        }
    }
}

async function seedUsers() {
    console.log('🌱 Starting seed process (Raw SQL)...');

    try {
        // Super Admin
        await createOrUpdateUser({
            email: 'superadmin@titan.com',
            password: 'SuperSecretPassword123!',
            username: 'TitanMaster',
            role: 'SUPERADMIN'
        }, 1000000);

        // Admin
        await createOrUpdateUser({
            email: 'admin@titan.com',
            password: 'AdminSecretPassword123!',
            username: 'TitanAdmin',
            role: 'ADMIN'
        }, 500000);

        console.log('✅ Seed process completed.');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await pool.end();
        console.log('🔌 Disconnected');
    }
}

seedUsers();
