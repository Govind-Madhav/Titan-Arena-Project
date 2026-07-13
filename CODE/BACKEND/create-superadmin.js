/* eslint-disable no-console */
/* eslint-disable-next-line no-hardcoded-passwords */
const { db } = require('./src/db');
const { users, wallets } = require('./src/db/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const uidService = require('./src/services/uid.service');

async function createSuperAdmin() {
    try {
        const email = 'superadmin@titan.com';
        // NOTE: Change this password immediately after first login in production
        const password = process.env.SUPERADMIN_PASSWORD || `SuperAdmin_${crypto.randomBytes(6).toString('hex')}!`;
        console.log(`Using temporary superadmin password: ${password}`);
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if exists
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existing.length > 0) {
            console.log('SuperAdmin already exists, updating role...');
            await db.transaction(async (tx) => {
                const [row] = await tx.select({ superAdminUid: users.superAdminUid }).from(users).where(eq(users.email, email)).limit(1);
                const superAdminUid = row?.superAdminUid || (await uidService.generateRoleUid('SUPERADMIN', tx)).uid;

                await tx.update(users)
                    .set({
                        role: 'SUPERADMIN',
                        password: hashedPassword,
                        emailVerified: true,
                        superAdminUid
                    })
                    .where(eq(users.email, email));
            });
            console.log('SuperAdmin updated.');
        } else {
            console.log('Creating new SuperAdmin...');
            const userId = crypto.randomUUID();
            await db.transaction(async (tx) => {
                const { uid: superAdminUid } = await uidService.generateRoleUid('SUPERADMIN', tx);

                await tx.insert(users).values({
                    id: userId,
                    email,
                    username: 'TitanMaster',
                    password: hashedPassword,
                    role: 'SUPERADMIN',
                    emailVerified: true,
                    hostStatus: 'VERIFIED',
                    superAdminUid
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
