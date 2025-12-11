const { db } = require('./src/db');
const { users, wallets } = require('./src/db/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createSuperAdmin() {
    try {
        const email = 'superadmin@titan.com';
        const password = 'SuperSecretPassword123!';
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if exists
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existing.length > 0) {
            console.log('SuperAdmin already exists, updating role...');
            await db.update(users)
                .set({
                    role: 'SUPERADMIN',
                    password: hashedPassword,
                    emailVerified: true
                })
                .where(eq(users.email, email));
            console.log('SuperAdmin updated.');
        } else {
            console.log('Creating new SuperAdmin...');
            const userId = crypto.randomUUID();
            await db.transaction(async (tx) => {
                await tx.insert(users).values({
                    id: userId,
                    email,
                    username: 'TitanMaster',
                    password: hashedPassword,
                    role: 'SUPERADMIN',
                    emailVerified: true,
                    hostStatus: 'VERIFIED'
                });

                await tx.insert(wallets).values({
                    userId,
                    balance: 1000000,
                    locked: 0
                });
            });
            console.log('SuperAdmin created.');
        }

        console.log('Credentials:');
        console.log('Email:', email);
        console.log('Password:', password);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createSuperAdmin();
