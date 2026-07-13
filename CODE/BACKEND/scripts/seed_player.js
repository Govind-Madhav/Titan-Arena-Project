/**
 * Seed Player User
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users, wallets, playerProfiles, uidCounters } = require('../src/db/schema');
const { eq, sql } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const run = async () => {
    try {
        const email = 'qa_player@titan.test';
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing[0]) {
            console.log('Player already exists');
            process.exit(0);
        }

        const hash = await bcrypt.hash('Admin@1234', 12);
        const id = crypto.randomUUID();

        await db.transaction(async tx => {
            await tx.update(uidCounters)
                .set({ lastValue: sql`${uidCounters.lastValue} + 1` })
                .where(eq(uidCounters.region, 1));

            const [row] = await tx.select().from(uidCounters).where(eq(uidCounters.region, 1));
            const uid = '1' + String(row.lastValue).padStart(9, '0');

            await tx.insert(users).values({
                id, platformUid: uid, username: 'qa_player', email,
                passwordHash: hash,
                emailVerified: true,
                role: 'PLAYER',
                hostStatus: 'NOT_VERIFIED',
                countryCode: 'IN',
                state: 'MH',
                legalName: 'QA Player',
                dateOfBirth: new Date('1998-06-15'),
                regionCode: 1,
                registrationCompleted: true,
                termsAccepted: true,
            });

            await tx.insert(wallets).values({ 
                id: crypto.randomUUID(),
                userId: id, 
                balance: 100000, 
                locked: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }); // ₹1,000.00
            await tx.insert(playerProfiles).values({ userId: id, ign: 'QAPlayer01' });

            console.log('✅ Player user seeded successfully!');
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();
