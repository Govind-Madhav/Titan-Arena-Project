/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { wallets, transactions, users } = require('../../db/schema');
const { eq, desc, and } = require('drizzle-orm');
const walletService = require('./wallet.service');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1. Get Wallet
const getWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);

        if (!wallet[0]) {
            // Should exist from signup, but safe fallback
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }

        // Fetch billing address from users
        const user = await db.select({ billingAddress: users.billingAddress, invoiceEmail: users.invoiceEmail })
            .from(users).where(eq(users.id, userId)).limit(1);

        res.json({
            success: true,
            data: {
                ...wallet[0],
                billingAddress: user[0]?.billingAddress || null,
                invoiceEmail: user[0]?.invoiceEmail || null
            }
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
    }
};

// 2. Get Transaction History
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20 } = req.query;

        const history = await db.select()
            .from(transactions)
            .where(eq(transactions.userId, userId))
            .orderBy(desc(transactions.createdAt))
            .limit(parseInt(limit));

        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
};

// 3. Update Billing Address
const updateBillingAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { billingAddress, invoiceEmail } = req.body;

        // Simple validation
        if (billingAddress && typeof billingAddress !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid address format' });
        }

        await db.update(users)
            .set({
                billingAddress: billingAddress || undefined,
                invoiceEmail: invoiceEmail || undefined
            })
            .where(eq(users.id, userId));

        res.json({ success: true, message: 'Billing details updated' });

    } catch (error) {
        console.error('Update billing error:', error);
        res.status(500).json({ success: false, message: 'Failed to update billing details' });
    }
};

// ─── Razorpay Deposit Flow ───────────────────────────────────────────────────

/**
 * Step 1: Create a Razorpay order and return it to the frontend.
 * The frontend will use the order ID to open the Razorpay checkout modal.
 */
const initDeposit = async (req, res) => {
    try {
        const { amount } = req.body; // amount in RUPEES from client
        if (!amount || amount < 10) {
            return res.status(400).json({ success: false, message: 'Minimum deposit is ₹10' });
        }

        const amountInPaise = Math.round(amount * 100); // Razorpay uses paise

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `titan_${req.user.id}_${Date.now()}`,
            notes: {
                userId: req.user.id,
                purpose: 'wallet_deposit'
            }
        });

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                // Send the public key to be used in the frontend checkout
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Init deposit error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
};

/**
 * Step 2: After payment is completed, Razorpay sends payment details to the frontend.
 * The frontend POST these details here for server-side verification before crediting the wallet.
 */
const verifyDeposit = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
        }

        // HMAC SHA256 signature verification
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
        }

        // Fetch original order amount from Razorpay to prevent tampering
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const amountInPaise = Number(order.amount);

        // Check this payment hasn't already been credited (idempotency)
        const [existingTx] = await db.select().from(transactions)
            .where(and(
                eq(transactions.userId, req.user.id),
                eq(transactions.source, 'RAZORPAY_DEPOSIT'),
                eq(transactions.metadata, JSON.stringify({ razorpay_payment_id }))
            ))
            .limit(1);

        if (existingTx) {
            return res.status(409).json({ success: false, message: 'Payment already credited' });
        }

        // Credit the wallet
        const result = await walletService.credit(
            req.user.id,
            amountInPaise,
            'CREDIT',
            'RAZORPAY_DEPOSIT',
            `Razorpay deposit — ${razorpay_payment_id}`,
            { razorpay_payment_id, razorpay_order_id }
        );

        res.json({
            success: true,
            message: `₹${(amountInPaise / 100).toFixed(2)} added to your wallet!`,
            data: result.wallet
        });
    } catch (error) {
        console.error('Verify deposit error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
};

// ─── Withdrawal Flow ─────────────────────────────────────────────────────────

/**
 * Player requests a withdrawal. Funds are locked in wallet and a PENDING
 * transaction is created. Admin then approves via the Admin Panel.
 */
const requestWithdraw = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, upiId } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₹100' });
        }
        if (!upiId || !upiId.includes('@')) {
            return res.status(400).json({ success: false, message: 'A valid UPI ID (e.g. name@upi) is required' });
        }

        const amountInPaise = Math.round(amount * 100);
        await walletService.requestWithdrawal(userId, amountInPaise);

        // Log the UPI ID for admin to process manually / via Razorpay Payouts API
        console.log(`💸 Withdrawal request: ${userId} → ₹${amount} → UPI: ${upiId}`);

        res.json({
            success: true,
            message: `Withdrawal request of ₹${amount} submitted. Processing time: 24-48 hours.`
        });
    } catch (error) {
        if (error.message === 'Insufficient available balance') {
            return res.status(400).json({ success: false, message: 'Insufficient balance for withdrawal' });
        }
        console.error('Withdraw request error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit withdrawal request' });
    }
};

/**
 * Get withdrawal history for the authenticated player
 */
const getMyWithdrawals = async (req, res) => {
    try {
        const userId = req.user.id;

        const withdrawals = await db.select()
            .from(transactions)
            .where(and(
                eq(transactions.userId, userId),
                eq(transactions.source, 'WITHDRAWAL')
            ))
            .orderBy(desc(transactions.createdAt))
            .limit(20);

        res.json({ success: true, data: withdrawals });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
    }
};

// Safe Simulated Transactions (For Dev/Test Only)
const simulateDeposit = async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ success: false, message: 'Simulated transactions are disabled in production API.' });
        }

        const userId = req.user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount required' });
        }

        const result = await walletService.credit(
            userId,
            parseInt(amount),
            'CREDIT',
            'TEST_DEPOSIT',
            'Simulated Test Deposit',
            { testMode: true }
        );

        res.json({ success: true, message: 'Test deposit successful', data: result.wallet });
    } catch (error) {
        console.error('Simulate deposit error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to simulate deposit' });
    }
};

const simulateWithdrawal = async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ success: false, message: 'Simulated transactions are disabled in production API.' });
        }

        const userId = req.user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount required' });
        }

        const result = await walletService.debit(
            userId,
            parseInt(amount),
            'DEBIT',
            'TEST_WITHDRAWAL',
            'Simulated Test Withdrawal',
            { testMode: true }
        );

        res.json({ success: true, message: 'Test withdrawal successful', data: result.wallet });
    } catch (error) {
        if (error.message === 'Insufficient balance') {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }
        console.error('Simulate withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to simulate withdrawal' });
    }
};

module.exports = {
    getWallet,
    updateWallet: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
    getTransactions,
    updateBillingAddress,
    createTransaction: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
    initDeposit,
    verifyDeposit,
    requestWithdraw,
    getMyWithdrawals,
    simulateDeposit,
    simulateWithdrawal
};
