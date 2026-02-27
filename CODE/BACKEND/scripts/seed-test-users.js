/**
 * Seeds two test users (PLAYER + HOST) directly into the DB.
 * Bypasses OTP so we can test authenticated endpoints immediately.
 * Safe to re-run — uses onConflictDoNothing.
 *
 * Usage: node scripts/seed-test-users.js
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users, wallets, playerProfiles, uidCounters } = require('../src/db/schema');
const { eq, sql } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const PASS = 'Admin@1234';

async function seedUser({ email, username, ign, role, hostStatus, balance }) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
        console.log(`⏭️  ${role} already exists: ${email}`);
        return existing[0].id;
    }

    const hash = await bcrypt.hash(PASS, 12);
    const id = crypto.randomUUID();

    await db.transaction(async tx => {
        await tx.update(uidCounters)
            .set({ lastValue: sql`${uidCounters.lastValue} + 1` })
            .where(eq(uidCounters.region, 1));

        const [row] = await tx.select().from(uidCounters).where(eq(uidCounters.region, 1));
        const uid = '1' + String(row.lastValue).padStart(9, '0');

        await tx.insert(users).values({
            id, platformUid: uid, username, email,
            passwordHash: hash,
            emailVerified: true,
            role,
            hostStatus: hostStatus || 'NOT_VERIFIED',
            countryCode: 'IN',
            state: 'MH',
            legalName: `QA ${role}`,
            dateOfBirth: new Date('1998-06-15'),
            regionCode: 1,
            registrationCompleted: true,
            termsAccepted: true,
        });

        await tx.insert(wallets).values({ userId: id, balance, currency: 'INR' });
        await tx.insert(playerProfiles).values({ userId: id, ign });

        console.log(`✅ ${role} seeded: ${email}  UID: ${uid}`);
    });

    return id;
}

async function main() {
    await seedUser({ email: 'qa_player@titan.test', username: 'qa_player', ign: 'QAPlayer01', role: 'PLAYER', balance: 500 });
    await seedUser({ email: 'qa_host@titan.test', username: 'qa_host', ign: 'QAHost01', role: 'HOST', hostStatus: 'VERIFIED', balance: 1000 });
    console.log('\nCredentials (both): password = Admin@1234');
    process.exit(0);
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
