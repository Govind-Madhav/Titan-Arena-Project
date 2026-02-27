/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { wallets, transactions, users } = require('../../db/schema');
const { eq, desc } = require('drizzle-orm');

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

// Stubs for Payments features (Later)
const stubHandler = (req, res) => {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
};

module.exports = {
    getWallet,
    updateWallet: stubHandler,
    getTransactions,
    updateBillingAddress,
    createTransaction: stubHandler,
    initDeposit: stubHandler,
    verifyDeposit: stubHandler,
    requestWithdraw: stubHandler,
    getMyWithdrawals: stubHandler
};
