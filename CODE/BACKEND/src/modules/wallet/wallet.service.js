/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const prisma = require('../../config/prisma');

/**
 * Wallet Service - Handles all money operations
 * CRITICAL: All balance changes must go through this service
 */

/**
 * Credit amount to user's wallet
 * @param {string} userId 
 * @param {number} amount - Amount in paise (positive)
 * @param {string} type - Transaction type
 * @param {string} message - Optional message
 * @param {object} meta - Optional metadata
 * @param {object} tx - Optional Prisma transaction client
 */
const credit = async (userId, amount, type, message = null, meta = null, tx = null) => {
    const client = tx || prisma;

    if (amount <= 0) {
        throw new Error('Credit amount must be positive');
    }

    const wallet = await client.wallet.findUnique({
        where: { userId }
    });

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    // Update wallet and create transaction atomically
    const [updatedWallet, transaction] = await Promise.all([
        client.wallet.update({
            where: { userId },
            data: { balance: { increment: amount } }
        }),
        client.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type,
                amount: amount, // Positive for credit
                message,
                meta,
                status: 'COMPLETED'
            }
        })
    ]);

    return { wallet: updatedWallet, transaction };
};

/**
 * Debit amount from user's wallet
 * @param {string} userId 
 * @param {number} amount - Amount in paise (positive, will be stored as negative)
 * @param {string} type - Transaction type
 * @param {string} message - Optional message
 * @param {object} meta - Optional metadata
 * @param {object} tx - Optional Prisma transaction client
 */
const debit = async (userId, amount, type, message = null, meta = null, tx = null) => {
    const client = tx || prisma;

    if (amount <= 0) {
        throw new Error('Debit amount must be positive');
    }

    const wallet = await client.wallet.findUnique({
        where: { userId }
    });

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
    }

    // Update wallet and create transaction atomically
    const [updatedWallet, transaction] = await Promise.all([
        client.wallet.update({
            where: { userId },
            data: { balance: { decrement: amount } }
        }),
        client.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type,
                amount: -amount, // Negative for debit
                message,
                meta,
                status: 'COMPLETED'
            }
        })
    ]);

    return { wallet: updatedWallet, transaction };
};

/**
 * Lock amount in wallet (for pending operations)
 */
const lockAmount = async (userId, amount, tx = null) => {
    const client = tx || prisma;

    const wallet = await client.wallet.findUnique({
        where: { userId }
    });

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    const availableBalance = wallet.balance - wallet.locked;
    if (availableBalance < amount) {
        throw new Error('Insufficient available balance');
    }

    return client.wallet.update({
        where: { userId },
        data: { locked: { increment: amount } }
    });
};

/**
 * Unlock amount in wallet
 */
const unlockAmount = async (userId, amount, tx = null) => {
    const client = tx || prisma;

    return client.wallet.update({
        where: { userId },
        data: { locked: { decrement: amount } }
    });
};

/**
 * Get wallet with available balance
 */
const getWallet = async (userId) => {
    const wallet = await prisma.wallet.findUnique({
        where: { userId }
    });

    if (!wallet) {
        return null;
    }

    return {
        ...wallet,
        availableBalance: wallet.balance - wallet.locked
    };
};

/**
 * Transfer between users (for prizes, etc.)
 */
const transfer = async (fromUserId, toUserId, amount, type, message = null, meta = null) => {
    return prisma.$transaction(async (tx) => {
        const debitResult = await debit(fromUserId, amount, type, message, meta, tx);
        const creditResult = await credit(toUserId, amount, type, message, meta, tx);

        return {
            fromWallet: debitResult.wallet,
            toWallet: creditResult.wallet,
            debitTransaction: debitResult.transaction,
            creditTransaction: creditResult.transaction
        };
    });
};

module.exports = {
    credit,
    debit,
    lockAmount,
    unlockAmount,
    getWallet,
    transfer
};
