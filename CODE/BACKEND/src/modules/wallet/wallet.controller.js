/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { wallets, transactions } = require('../../db/schema');
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

        res.json({ success: true, data: wallet[0] });
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

// Stubs for Payments features (Later)
const stubHandler = (req, res) => {
    res.status(501).json({ success: false, message: 'Feature coming soon' });
};

module.exports = {
    getWallet,
    updateWallet: stubHandler,
    getTransactions,
    createTransaction: stubHandler,
    initDeposit: stubHandler,
    verifyDeposit: stubHandler,
    requestWithdraw: stubHandler,
    getMyWithdrawals: stubHandler
};
