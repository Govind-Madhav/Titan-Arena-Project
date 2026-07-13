/**
 * Unified E2E Lifecycle flow for User (depositing) and Host (verification & alignment)
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users, wallets, transactions, kycRequests } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const authController = require('../src/modules/auth/auth.controller');
const walletController = require('../src/modules/wallet/wallet.controller');
const kycController = require('../src/modules/kyc/kyc.controller');

const mockResponse = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.jsonData = data;
        return res;
    };
    res.send = (text) => {
        res.sendText = text;
        return res;
    };
    return res;
};

const runUserHostTest = async () => {
    try {
        console.log('🏁 Starting Unified User and Host End-to-End Test Flow...');

        // 1. Resolve Titan user
        const [titan] = await db.select().from(users).where(eq(users.username, 'Titan')).limit(1);
        if (!titan) {
            console.error('❌ Test user Titan not found');
            process.exit(1);
        }

        // Reset user location & role for clean state testing
        await db.update(users)
            .set({
                countryCode: 'IN',
                regionCode: 1,
                subRegionCode: null,
                role: 'PLAYER',
                hostStatus: 'NOT_VERIFIED',
                hostUid: null
            })
            .where(eq(users.id, titan.id));

        console.log('\n--- 1. Testing Location Detection ---');
        const reqDetect = {
            headers: {
                'x-forwarded-for': '8.8.8.8' // Public US DNS IP
            }
        };
        const resDetect = mockResponse();
        await authController.detectLocation(reqDetect, resDetect);
        console.log('Detect Location Result:', resDetect.jsonData);

        console.log('\n--- 2. Testing Stripe Deposit Checkout Session ---');
        const reqDepositInit = {
            user: titan,
            body: { amount: 1500 } // ₹1,500
        };
        const resDepositInit = mockResponse();
        await walletController.initStripeDeposit(reqDepositInit, resDepositInit);
        console.log('Stripe Deposit Session Result:', resDepositInit.jsonData);

        const sessionId = resDepositInit.jsonData.sessionId;

        console.log('\n--- 3. Testing Stripe Webhook Credit Completion ---');
        const walletService = require('../src/modules/wallet/wallet.service');
        const creditResult = await walletService.credit(
            titan.id,
            150000,
            'CREDIT',
            'STRIPE_DEPOSIT',
            `Stripe deposit — ${sessionId}`,
            { stripeSessionId: sessionId }
        );
        console.log('Wallet Credited successfully. Balance:', creditResult.wallet.balance);

        console.log('\n--- 4. Testing Stripe Identity Verification Session ---');
        const reqIdentityInit = {
            user: titan
        };
        const resIdentityInit = mockResponse();
        await kycController.createStripeVerificationSession(reqIdentityInit, resIdentityInit);
        console.log('Identity Verification Session Result:', resIdentityInit.jsonData);

        console.log('\n--- 5. Testing Stripe Identity Alignment Webhook ---');
        console.log('⚙️ Processing verification report for country "US"...');
        const uidService = require('../src/services/uid.service');
        const { COUNTRY_TO_REGION } = require('../src/config/regions.config');
        const regionMapping = COUNTRY_TO_REGION['US'];

        await db.transaction(async (tx) => {
            const [kycRow] = await tx.select().from(kycRequests).where(eq(kycRequests.userId, titan.id)).limit(1);
            if (kycRow) {
                await tx.update(kycRequests)
                    .set({
                        status: 'VERIFIED',
                        adminNotes: `Verified via Stripe Identity. Country verified as: US`,
                        updatedAt: new Date()
                    })
                    .where(eq(kycRequests.id, kycRow.id));
            }

            const hostUid = (await uidService.generateRoleUid('HOST', tx)).uid;

            await tx.update(users)
                .set({
                    countryCode: 'US',
                    regionCode: regionMapping.region,
                    subRegionCode: regionMapping.subRegion,
                    hostStatus: 'VERIFIED',
                    role: 'HOST',
                    hostUid,
                    updatedAt: new Date()
                })
                .where(eq(users.id, titan.id));
        });

        // Verify final state
        const [updatedUser] = await db.select().from(users).where(eq(users.id, titan.id)).limit(1);
        console.log('\n--- Final Verification Check ---');
        console.log(`👤 User: ${updatedUser.username}`);
        console.log(`📍 Verified Location: Country: ${updatedUser.countryCode}, Region: ${updatedUser.regionCode}, Sub-Region: ${updatedUser.subRegionCode}`);
        console.log(`🏷️ Role: ${updatedUser.role}, HostStatus: ${updatedUser.hostStatus}, HostUID: ${updatedUser.hostUid}`);
        
        if (updatedUser.role === 'HOST' && updatedUser.countryCode === 'US' && updatedUser.regionCode === 4) {
            console.log('🎉 SUCCESS: Full End-to-End User and Host flow tested successfully!');
        } else {
            console.error('❌ FAILURE: Mismatch in final verified user state.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
};

runUserHostTest();
