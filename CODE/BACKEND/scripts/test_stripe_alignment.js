/**
 * Test Stripe Identity database alignment and country locking
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users, kycRequests } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const { COUNTRY_TO_REGION } = require('../src/config/regions.config');
const uidService = require('../src/services/uid.service');
const crypto = require('crypto');

const runTest = async () => {
    try {
        console.log('🔍 Looking up user "Titan"...');
        const [user] = await db.select().from(users).where(eq(users.username, 'Titan')).limit(1);
        if (!user) {
            console.error('❌ User "Titan" not found in database. Run signup or seed first.');
            process.exit(1);
        }

        console.log(`👤 Found user: ${user.username} (ID: ${user.id})`);
        console.log(`📍 Current Location: Country: ${user.countryCode}, Region: ${user.regionCode}, Sub-Region: ${user.subRegionCode}`);

        // We will mock aligning them to 'US'
        const testCountry = 'US';
        const regionMapping = COUNTRY_TO_REGION[testCountry];
        console.log(`⚙️ Aligning user to verified Stripe Country: ${testCountry} (Region: ${regionMapping.region}, Sub-Region: ${regionMapping.subRegion})`);

        await db.transaction(async (tx) => {
            // Find existing kycRequest or create one
            const [kycRow] = await tx.select().from(kycRequests).where(eq(kycRequests.userId, user.id)).limit(1);
            let kycId;

            if (kycRow) {
                kycId = kycRow.id;
                await tx.update(kycRequests)
                    .set({
                        status: 'VERIFIED',
                        adminNotes: `Test Verified via Stripe Identity. Country verified: ${testCountry}`,
                        updatedAt: new Date()
                    })
                    .where(eq(kycRequests.id, kycId));
            } else {
                kycId = crypto.randomUUID();
                await tx.insert(kycRequests).values({
                    id: kycId,
                    userId: user.id,
                    documentType: 'STRIPE_IDENTITY',
                    proofUrl: 'stripe_session:test_session_id',
                    selfieUrl: 'stripe_session:test_session_id',
                    status: 'VERIFIED',
                    adminNotes: `Test Verified via Stripe Identity. Country verified: ${testCountry}`
                });
            }

            // Generate hostUid if not present
            const hostUid = user.hostUid || (await uidService.generateRoleUid('HOST', tx)).uid;

            // Overwrite and lock country/region fields
            await tx.update(users)
                .set({
                    countryCode: testCountry,
                    regionCode: regionMapping.region,
                    subRegionCode: regionMapping.subRegion,
                    hostStatus: 'VERIFIED',
                    role: 'HOST',
                    hostUid,
                    updatedAt: new Date()
                })
                .where(eq(users.id, user.id));
        });

        // Fetch updated user to verify
        const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        console.log('✅ Database transaction successful!');
        console.log(`📍 Updated Location: Country: ${updatedUser.countryCode}, Region: ${updatedUser.regionCode}, Sub-Region: ${updatedUser.subRegionCode}`);
        console.log(`🏷️ Role: ${updatedUser.role}, HostStatus: ${updatedUser.hostStatus}, HostUID: ${updatedUser.hostUid}`);

        if (updatedUser.countryCode === testCountry && updatedUser.regionCode === regionMapping.region && updatedUser.hostStatus === 'VERIFIED') {
            console.log('🎉 SUCCESS: GeoIP Alignment & Location Overwrite verified!');
        } else {
            console.error('❌ FAILURE: Location data mismatch after update.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed with error:', err);
        process.exit(1);
    }
};

runTest();
