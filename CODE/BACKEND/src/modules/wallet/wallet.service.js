/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { wallets, transactions, tournaments, matches } = require('../../db/schema');
const { eq, and, sql } = require('drizzle-orm');

/**
 * Wallet Service - Handles all money operations
 * CRITICAL: All balance changes must go through this service
 */

/**
 * Credit amount to user's wallet
 * @param {string} userId 
 * @param {number} amount - Amount in paise (positive)
 * @param {string} type - Transaction type (CREDIT) - legacy, will be validated
 * @param {string} source - Source (TOURNAMENT_ENTRY, WINNING, etc.)
 * @param {string} message - Optional message
 * @param {object} metadata - Optional metadata (replaces meta)
 * @param {string} tournamentId - Optional tournament ID
 * @param {object} tx - Optional Drizzle transaction client
 */
const credit = async (userId, amount, type, source, message = null, metadata = null, tournamentId = null, tx = null) => {
    const client = tx || db;

    if (amount <= 0) {
        throw new Error('Credit amount must be positive');
    }

    const [wallet] = await client.select().from(wallets).where(eq(wallets.userId, userId));

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    // Update wallet and create transaction atomically
    // Using atomic increment for balance
    await client.update(wallets)
        .set({ balance: sql`${wallets.balance} + ${amount}` })
        .where(eq(wallets.userId, userId));

    // Fetch updated wallet to return correct balance
    const [updatedWallet] = await client.select().from(wallets).where(eq(wallets.userId, userId));

    const newTransaction = {
        userId,
        walletId: wallet.id,
        type: 'CREDIT',
        source: source || 'MANUAL_CREDIT', // Default if missing
        amount: amount,
        balanceAfter: updatedWallet.balance,
        tournamentId,
        message,
        metadata: JSON.stringify(metadata),
        status: 'COMPLETED'
    };

    const [transactionResult] = await client.insert(transactions).values(newTransaction).$returningId();
    // Re-fetch transaction to return full object if needed, or just construct it. 
    // Usually frontend just needs to know it succeeded.

    return { wallet: updatedWallet, transaction: { ...newTransaction, id: transactionResult.id } };
};

/**
 * Debit amount from user's wallet
 * @param {string} userId 
 * @param {number} amount - Amount in paise (positive, will be stored as negative)
 * @param {string} type - Transaction type (DEBIT)
 * @param {string} source - Source (TOURNAMENT_ENTRY, WITHDRAWAL, etc.)
 * @param {string} message - Optional message
 * @param {object} metadata - Optional metadata
 * @param {string} tournamentId - Optional tournament ID
 * @param {object} tx - Optional Drizzle transaction client
 */
const debit = async (userId, amount, type, source, message = null, metadata = null, tournamentId = null, tx = null) => {
    const client = tx || db;

    if (amount <= 0) {
        throw new Error('Debit amount must be positive');
    }

    const [wallet] = await client.select().from(wallets).where(eq(wallets.userId, userId));

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
    }

    // Update wallet and create transaction atomically
    await client.update(wallets)
        .set({ balance: sql`${wallets.balance} - ${amount}` })
        .where(eq(wallets.userId, userId));

    const [updatedWallet] = await client.select().from(wallets).where(eq(wallets.userId, userId));

    const newTransaction = {
        userId,
        walletId: wallet.id,
        type: 'DEBIT',
        source: source || 'MANUAL_DEBIT',
        amount: -amount, // Negative for debit
        balanceAfter: updatedWallet.balance,
        tournamentId,
        message,
        metadata: JSON.stringify(metadata),
        status: 'COMPLETED'
    };

    const [transactionResult] = await client.insert(transactions).values(newTransaction).$returningId();

    return { wallet: updatedWallet, transaction: { ...newTransaction, id: transactionResult.id } };
};

/**
 * Lock amount in wallet (for pending operations)
 */
const lockAmount = async (userId, amount, tx = null) => {
    const client = tx || db;

    const [wallet] = await client.select().from(wallets).where(eq(wallets.userId, userId));

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    const availableBalance = wallet.balance - wallet.locked;
    if (availableBalance < amount) {
        throw new Error('Insufficient available balance');
    }

    return client.update(wallets)
        .set({ locked: sql`${wallets.locked} + ${amount}` })
        .where(eq(wallets.userId, userId));
};

/**
 * Unlock amount in wallet
 */
const unlockAmount = async (userId, amount, tx = null) => {
    const client = tx || db;

    return client.update(wallets)
        .set({ locked: sql`${wallets.locked} - ${amount}` })
        .where(eq(wallets.userId, userId));
};

/**
 * Get wallet with available balance
 */
const getWallet = async (userId) => {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));

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
    return db.transaction(async (tx) => {
        const debitResult = await debit(fromUserId, amount, type, message, meta, null, tx);
        const creditResult = await credit(toUserId, amount, type, message, meta, null, null, tx);

        return {
            fromWallet: debitResult.wallet,
            toWallet: creditResult.wallet,
            debitTransaction: debitResult.transaction,
            creditTransaction: creditResult.transaction
        };
    });
};



/**
 * Distribute tournament prizes and host earnings
 * @param {string} tournamentId
 */
const distributeTournamentPrizes = async (tournamentId) => {
    // 1. Fetch tournament details 
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));

    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status === 'COMPLETED') throw new Error('Tournament already distributed');

    // Count players
    // Optimized: Count directly from registrations
    // const totalPlayers = tournament.registrations.length; 
    // Drizzle doesn't auto-fetch relations unless using relational queries API which is experimental/needs config.
    // Easier to count manually.
    const [regCount] = await db.select({ count: sql`count(*)` })
        .from(require('../../db/schema').registrations) // lazy load to avoid circular deps if any
        .where(
            and(
                eq(require('../../db/schema').registrations.tournamentId, tournamentId),
                eq(require('../../db/schema').registrations.status, 'CONFIRMED')
            )
        );

    const totalPlayers = Number(regCount.count);
    const totalCollected = tournament.entryFee * totalPlayers;
    const platformFee = Math.floor(totalCollected * 0.10); // 10% platform fee example
    const prizePool = tournament.prizePool;
    const hostEarnings = totalCollected - platformFee - prizePool;

    // Use transaction for atomicity
    return db.transaction(async (tx) => {
        // 2. Credit Host
        if (hostEarnings > 0) {
            await credit(
                tournament.hostId,
                hostEarnings,
                'CREDIT',
                'HOST_EARNING',
                `Earnings for ${tournament.name}`,
                { tournamentId, totalPlayers, platformFee },
                tournamentId,
                tx
            );
        }

        // 3. Credit Winners 
        // Logic to find winner would go here. 
        // Placeholder for winner finding:
        // const [finalMatch] = await tx.select().from(matches) ...

        // 4. Update Tournament Status
        await tx.update(tournaments)
            .set({
                status: 'COMPLETED',
                hostProfit: hostEarnings,
                collected: totalCollected
            })
            .where(eq(tournaments.id, tournamentId));
    });
};

/**
 * Request withdrawal
 */
const requestWithdrawal = async (userId, amount) => {
    return db.transaction(async (tx) => {
        const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
        if (!wallet) throw new Error('Wallet not found');

        const available = wallet.balance - wallet.locked;
        if (available < amount) throw new Error('Insufficient available balance');

        // Lock amount
        await tx.update(wallets)
            .set({ locked: sql`${wallets.locked} + ${amount}` })
            .where(eq(wallets.userId, userId));

        // Create PENDING transaction
        const newTransaction = {
            userId,
            walletId: wallet.id,
            type: 'DEBIT',
            source: 'WITHDRAWAL',
            amount: -amount,
            balanceAfter: wallet.balance,
            message: 'Withdrawal Request',
            status: 'PENDING'
        };

        return tx.insert(transactions).values(newTransaction);
    });
};

/**
 * Approve withdrawal
 */
const approveWithdrawal = async (transactionId, adminId) => {
    return db.transaction(async (tx) => {
        const [transaction] = await tx.select().from(transactions).where(eq(transactions.id, transactionId));
        if (!transaction || transaction.status !== 'PENDING') throw new Error('Invalid transaction');

        // Decrease actual balance and unlock
        await tx.update(wallets)
            .set({
                balance: sql`${wallets.balance} - ${Math.abs(transaction.amount)}`,
                locked: sql`${wallets.locked} - ${Math.abs(transaction.amount)}`
            })
            .where(eq(wallets.id, transaction.walletId));

        // Fetch updated wallet
        const [updatedWallet] = await tx.select().from(wallets).where(eq(wallets.id, transaction.walletId));

        // Update transaction
        await tx.update(transactions)
            .set({
                status: 'COMPLETED',
                balanceAfter: updatedWallet.balance,
                metadata: JSON.stringify({ approvedBy: adminId })
            })
            .where(eq(transactions.id, transactionId));

        return updatedWallet;
    });
};

/**
 * Get transactions with pagination
 */
const getTransactions = async (userId, limit = 10, offset = 0, type = null) => {
    let query = db.select().from(transactions).where(eq(transactions.userId, userId));

    if (type) {
        query.where(and(eq(transactions.userId, userId), eq(transactions.type, type)));
    }

    query.orderBy(sql`${transactions.createdAt} DESC`).limit(Number(limit)).offset(Number(offset));

    // Get total count
    let countQuery = db.select({ count: sql`count(*)` }).from(transactions).where(eq(transactions.userId, userId));
    if (type) {
        countQuery.where(and(eq(transactions.userId, userId), eq(transactions.type, type)));
    }

    const [results, countResult] = await Promise.all([
        query,
        countQuery
    ]);

    return { transactions: results, total: countResult[0].count };
};

module.exports = {
    credit,
    debit,
    lockAmount,
    unlockAmount,
    getWallet,
    transfer,
    distributeTournamentPrizes,
    requestWithdrawal,
    approveWithdrawal,
    getTransactions
};


