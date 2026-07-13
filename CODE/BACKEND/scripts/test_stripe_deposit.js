/**
 * Test Stripe Checkout Deposit transaction logic
 */
require('dotenv').config();
const { db } = require('../src/db');
const { users, wallets, transactions } = require('../src/db/schema');
const { eq, and } = require('drizzle-orm');
const walletService = require('../src/modules/wallet/wallet.service');

const runTest = async () => {
    try {
        console.log('🔍 Looking up user "Titan"...');
        const [user] = await db.select().from(users).where(eq(users.username, 'Titan')).limit(1);
        if (!user) {
            console.error('❌ User "Titan" not found in database.');
            process.exit(1);
        }

        const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
        if (!wallet) {
            console.error('❌ Wallet not found for user Titan.');
            process.exit(1);
        }

        console.log(`👤 Found user: ${user.username} (ID: ${user.id})`);
        console.log(`💰 Current Wallet Balance: ₹${(wallet.balance / 100).toFixed(2)}`);

        // Simulate deposit
        const depositAmount = 2500; // ₹25.00
        const depositAmountPaise = depositAmount * 100;
        const mockSessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}`;
        
        console.log(`💸 Simulating Stripe Deposit of ₹${depositAmount.toFixed(2)} (Session: ${mockSessionId})...`);

        // Check if this payment hasn't already been credited (idempotency)
        const [existingTx] = await db.select().from(transactions)
            .where(and(
                eq(transactions.userId, user.id),
                eq(transactions.source, 'STRIPE_DEPOSIT'),
                eq(transactions.metadata, JSON.stringify({ stripeSessionId: mockSessionId }))
            ))
            .limit(1);

        if (existingTx) {
            console.error('❌ Error: Webhook transaction already processed (idempotency failure).');
            process.exit(1);
        }

        // Credit the wallet
        const result = await walletService.credit(
            user.id,
            depositAmountPaise,
            'CREDIT',
            'STRIPE_DEPOSIT',
            `Stripe deposit — ${mockSessionId}`,
            { stripeSessionId: mockSessionId }
        );

        console.log('✅ Credit transaction successful!');
        console.log(`💰 Updated Wallet Balance: ₹${(result.wallet.balance / 100).toFixed(2)}`);

        if (result.wallet.balance === wallet.balance + depositAmountPaise) {
            console.log('🎉 SUCCESS: Stripe Wallet Deposit credited correctly!');
        } else {
            console.error('❌ FAILURE: Wallet balance did not match expected amount.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed with error:', err);
        process.exit(1);
    }
};

runTest();
