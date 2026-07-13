/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { wallets, transactions, users, kycRequests } = require('../../db/schema');
const { eq, desc, and, or, inArray, sql } = require('drizzle-orm');
const walletService = require('./wallet.service');
const Razorpay = require('razorpay');
const crypto = require('node:crypto');

let razorpayClient = null;

const getRazorpayClient = () => {
    if (razorpayClient) return razorpayClient;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null;
    }

    razorpayClient = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    return razorpayClient;
};

// Helper: Check wallet activation status
const checkWalletActivation = async (userId) => {
    const [user] = await db.select({ billingAddress: users.billingAddress })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    const [kyc] = await db.select({ status: kycRequests.status })
        .from(kycRequests)
        .where(eq(kycRequests.userId, userId))
        .limit(1);

    const isKycApproved = kyc?.status === 'APPROVED';
    const hasBillingAddress = Boolean(user?.billingAddress);

    return {
        isActivated: isKycApproved && hasBillingAddress,
        kycApproved: isKycApproved,
        hasBillingAddress,
        missingItems: [
            !isKycApproved && 'KYC verification',
            !hasBillingAddress && 'Billing address'
        ].filter(Boolean)
    };
};

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

        // Check activation status
        const activation = await checkWalletActivation(userId);

        res.json({
            success: true,
            data: {
                ...wallet[0],
                billingAddress: user[0]?.billingAddress || null,
                invoiceEmail: user[0]?.invoiceEmail || null,
                activation: {
                    isActivated: activation.isActivated,
                    kycApproved: activation.kycApproved,
                    hasBillingAddress: activation.hasBillingAddress,
                    missingItems: activation.missingItems
                }
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
            .limit(Number.parseInt(limit));

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
        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: 'Payment service is not configured. Please contact support.'
            });
        }

        const userId = req.user.id;

        // Check wallet activation
        const activation = await checkWalletActivation(userId);
        if (!activation.isActivated) {
            return res.status(403).json({
                success: false,
                message: `Wallet is not active. Complete the following: ${activation.missingItems.join(', ')}`,
                code: 'WALLET_NOT_ACTIVATED',
                required: activation.missingItems
            });
        }

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
        const razorpay = getRazorpayClient();
        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: 'Payment service is not configured. Please contact support.'
            });
        }

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

        // Check wallet activation
        const activation = await checkWalletActivation(userId);
        if (!activation.isActivated) {
            return res.status(403).json({
                success: false,
                message: `Wallet is not active. Complete the following: ${activation.missingItems.join(', ')}`,
                code: 'WALLET_NOT_ACTIVATED',
                required: activation.missingItems
            });
        }

        const { amount, upiId, bankAccount, ifscCode, accountHolderName } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₹100' });
        }

        const amountInPaise = Math.round(amount * 100);

        let payoutMethod = null;
        let payoutDetails = {};

        if (amount > 5000) {
            // Must be bank account
            if (upiId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Withdrawals exceeding ₹5,000 cannot be paid via UPI. Please provide bank details (Account Number, IFSC, Account Holder Name).' 
                });
            }
            if (!bankAccount || !ifscCode || !accountHolderName) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Bank account number, IFSC code, and Account Holder Name are required for withdrawals exceeding ₹5,000.' 
                });
            }
            payoutMethod = 'BANK';
        } else {
            // Can be UPI or Bank account
            if (!upiId && (!bankAccount || !ifscCode || !accountHolderName)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Either a valid UPI ID or complete bank details are required for withdrawal.' 
                });
            }
            if (upiId) {
                payoutMethod = 'UPI';
            } else {
                payoutMethod = 'BANK';
            }
        }

        // Validate formats
        if (payoutMethod === 'UPI') {
            if (!upiId.includes('@')) {
                return res.status(400).json({ success: false, message: 'A valid UPI ID (e.g. name@upi) is required.' });
            }
            payoutDetails = { upiId };
        } else {
            const cleanAccount = bankAccount.replace(/\s+/g, '');
            if (!/^\d{9,18}$/.test(cleanAccount)) {
                return res.status(400).json({ success: false, message: 'Bank account number must be between 9 and 18 digits.' });
            }
            const cleanIfsc = ifscCode.trim().toUpperCase();
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
                return res.status(400).json({ success: false, message: 'Invalid IFSC code format (e.g., SBIN0001234).' });
            }
            if (accountHolderName.trim().length < 2) {
                return res.status(400).json({ success: false, message: 'Account Holder Name must be at least 2 characters.' });
            }
            payoutDetails = {
                bankAccount: cleanAccount,
                ifscCode: cleanIfsc,
                accountHolderName: accountHolderName.trim()
            };
        }



        const metadata = {
            payoutMethod,
            payoutDetails,
            ...(amount > 5000 && {
                holdUntil: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                holdReason: 'Security hold for amount exceeding ₹5,000'
            })
        };

        await walletService.requestWithdrawal(userId, amountInPaise, metadata);

        // Log withdrawal details
        console.log(`💸 Withdrawal request: ${userId} → ₹${amount} via ${payoutMethod}`);

        let responseMessage = `Withdrawal request of ₹${amount} submitted successfully.`;
        if (amount > 5000) {
            responseMessage = `Withdrawal request of ₹${amount} submitted successfully. Note: As the amount exceeds ₹5,000, it is subject to a 4-day security hold before processing.`;
        }

        res.json({
            success: true,
            message: responseMessage
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
            Number.parseInt(amount),
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
            Number.parseInt(amount),
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
    updateWallet: async (req, res) => {
        try {
            const { status } = req.body;
            if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Valid wallet status is required' });
            }

            await db.update(wallets)
                .set({ status, updatedAt: new Date() })
                .where(eq(wallets.userId, req.user.id));

            const [updated] = await db.select().from(wallets).where(eq(wallets.userId, req.user.id)).limit(1);
            return res.json({ success: true, message: 'Wallet updated', data: updated });
        } catch (error) {
            console.error('Update wallet error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update wallet' });
        }
    },
    getTransactions,
    updateBillingAddress,
    createTransaction: async (req, res) => {
        try {
            const { direction, amount, source = 'MANUAL_ADJUSTMENT', message, metadata } = req.body;

            if (!['CREDIT', 'DEBIT'].includes(direction)) {
                return res.status(400).json({ success: false, message: 'direction must be CREDIT or DEBIT' });
            }
            if (!amount || amount <= 0) {
                return res.status(400).json({ success: false, message: 'Valid amount is required' });
            }

            const normalizedAmount = Number.parseInt(amount, 10);
            const result = direction === 'CREDIT'
                ? await walletService.credit(req.user.id, normalizedAmount, 'CREDIT', source, message || 'Manual credit', metadata || {})
                : await walletService.debit(req.user.id, normalizedAmount, 'DEBIT', source, message || 'Manual debit', metadata || {});

            return res.status(201).json({
                success: true,
                message: `${direction} transaction created`,
                data: result
            });
        } catch (error) {
            if (error.message === 'Insufficient balance') {
                return res.status(400).json({ success: false, message: 'Insufficient balance' });
            }
            console.error('Create transaction error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create transaction' });
        }
    },
    initDeposit,
    verifyDeposit,
    initStripeDeposit: async (req, res) => {
        try {
            const { amount } = req.body;
            if (!amount || amount <= 0) {
                return res.status(400).json({ success: false, message: 'Valid amount required' });
            }

            const { getStripeInstance } = require('../../config/stripe.config');
            const stripe = getStripeInstance();

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: 'Wallet Deposit',
                            description: `Deposit of ₹${amount} into Titan Arena Wallet`
                        },
                        unit_amount: Math.round(amount * 100)
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wallet?status=cancel`,
                metadata: {
                    userId: req.user.id,
                    amountInPaise: String(Math.round(amount * 100))
                }
            });

            res.json({
                success: true,
                checkoutUrl: session.url,
                sessionId: session.id
            });
        } catch (error) {
            console.error('Init Stripe checkout session error:', error);
            res.status(500).json({ success: false, message: 'Failed to initialize deposit session' });
        }
    },
    handleStripeDepositWebhook: async (req, res) => {
        const { getStripeInstance } = require('../../config/stripe.config');
        const stripe = getStripeInstance();
        const signature = req.headers['stripe-signature'];
        let event;

        const webhookSecret = process.env.STRIPE_DEPOSIT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
        if (process.env.NODE_ENV === 'production' && !webhookSecret) {
            console.error('❌ Production error: Stripe Deposit Webhook Secret is missing.');
            return res.status(500).json({ success: false, message: 'Webhook configuration error' });
        }

        try {
            const rawBody = req.rawBody;
            if (!rawBody) {
                return res.status(400).json({ success: false, message: 'Raw body is missing for signature verification' });
            }
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret || 'whsec_mock_secret_if_missing'
            );
        } catch (err) {
            console.error('Stripe deposit webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            const amountInPaise = Number(session.metadata?.amountInPaise);

            if (!userId || !amountInPaise) {
                console.warn(`Stripe checkout completion event missing metadata: userId=${userId}, amount=${amountInPaise}`);
                return res.json({ received: true });
            }

            try {
                const [existingTx] = await db.select().from(transactions)
                    .where(and(
                        eq(transactions.userId, userId),
                        eq(transactions.source, 'STRIPE_DEPOSIT'),
                        eq(transactions.metadata, JSON.stringify({ stripeSessionId: session.id }))
                    ))
                    .limit(1);

                if (existingTx) {
                    console.log(`Stripe deposit checkout session ${session.id} already processed`);
                    return res.status(409).json({ success: false, message: 'Payment already credited' });
                }

                const result = await walletService.credit(
                    userId,
                    amountInPaise,
                    'CREDIT',
                    'STRIPE_DEPOSIT',
                    `Stripe deposit — ${session.id}`,
                    { stripeSessionId: session.id }
                );

                console.log(`✅ Stripe deposit of ₹${(amountInPaise / 100).toFixed(2)} successfully credited to user ${userId}`);
            } catch (error) {
                console.error('Stripe deposit credit processing failed:', error);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }

        res.json({ received: true });
    },
    requestWithdraw,
    getMyWithdrawals,
    simulateDeposit,
    simulateWithdrawal
};
