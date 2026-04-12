/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { transactions, tournaments, registrations, users } = require('../../db/schema');
const { eq, and, desc, inArray } = require('drizzle-orm');
const walletService = require('../wallet/wallet.service');

const PAYMENT_SOURCES = ['TOURNAMENT_ENTRY', 'RAZORPAY_DEPOSIT', 'WITHDRAWAL'];

const createPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tournamentId } = req.body;

        if (!tournamentId) {
            return res.status(400).json({ success: false, message: 'tournamentId is required' });
        }

        const [tournament] = await db.select()
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId))
            .limit(1);

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        if (tournament.entryFee <= 0) {
            return res.status(400).json({ success: false, message: 'This tournament does not require payment' });
        }

        const [existingRegistration] = await db.select()
            .from(registrations)
            .where(and(
                eq(registrations.tournamentId, tournamentId),
                eq(registrations.userId, userId)
            ))
            .limit(1);

        if (existingRegistration?.paymentStatus === 'COMPLETED') {
            return res.status(409).json({ success: false, message: 'Tournament payment already completed' });
        }

        const result = await walletService.debit(
            userId,
            Number(tournament.entryFee),
            'DEBIT',
            'TOURNAMENT_ENTRY',
            `Tournament entry fee: ${tournament.name}`,
            { tournamentId },
            tournamentId
        );

        if (existingRegistration) {
            await db.update(registrations)
                .set({ paymentStatus: 'COMPLETED', updatedAt: new Date() })
                .where(eq(registrations.id, existingRegistration.id));
        } else {
            await db.insert(registrations).values({
                tournamentId,
                userId,
                status: 'PENDING',
                paymentStatus: 'COMPLETED'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Tournament payment completed',
            data: {
                wallet: result.wallet,
                transaction: result.transaction
            }
        });
    } catch (error) {
        if (error.message === 'Insufficient balance') {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }
        console.error('Create payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment' });
    }
};

const getMyPayments = async (req, res) => {
    try {
        const data = await db.select({
            id: transactions.id,
            source: transactions.source,
            type: transactions.type,
            amount: transactions.amount,
            status: transactions.status,
            createdAt: transactions.createdAt,
            tournamentId: transactions.tournamentId,
            tournamentName: tournaments.name,
            message: transactions.message
        })
            .from(transactions)
            .leftJoin(tournaments, eq(transactions.tournamentId, tournaments.id))
            .where(eq(transactions.userId, req.user.id))
            .orderBy(desc(transactions.createdAt));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get my payments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payments' });
    }
};

const getPaymentsByTournament = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const [tournament] = await db.select()
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId))
            .limit(1);

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const data = await db.select({
            id: transactions.id,
            userId: transactions.userId,
            username: users.username,
            email: users.email,
            amount: transactions.amount,
            status: transactions.status,
            source: transactions.source,
            createdAt: transactions.createdAt,
            message: transactions.message
        })
            .from(transactions)
            .leftJoin(users, eq(transactions.userId, users.id))
            .where(and(
                eq(transactions.tournamentId, tournamentId),
                inArray(transactions.source, PAYMENT_SOURCES)
            ))
            .orderBy(desc(transactions.createdAt));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get payments by tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournament payments' });
    }
};

const getAllPayments = async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const data = await db.select({
            id: transactions.id,
            userId: transactions.userId,
            username: users.username,
            source: transactions.source,
            type: transactions.type,
            amount: transactions.amount,
            status: transactions.status,
            tournamentId: transactions.tournamentId,
            tournamentName: tournaments.name,
            createdAt: transactions.createdAt
        })
            .from(transactions)
            .leftJoin(users, eq(transactions.userId, users.id))
            .leftJoin(tournaments, eq(transactions.tournamentId, tournaments.id))
            .where(inArray(transactions.source, PAYMENT_SOURCES))
            .orderBy(desc(transactions.createdAt))
            .limit(Number(limit));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payments' });
    }
};

const getPaymentById = async (req, res) => {
    try {
        const [payment] = await db.select()
            .from(transactions)
            .where(eq(transactions.id, req.params.id))
            .limit(1);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.userId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: payment });
    } catch (error) {
        console.error('Get payment by id error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payment' });
    }
};

const updatePaymentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const [payment] = await db.select()
            .from(transactions)
            .where(eq(transactions.id, req.params.id))
            .limit(1);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (!['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid payment status' });
        }

        await db.update(transactions)
            .set({ status })
            .where(eq(transactions.id, payment.id));

        res.json({ success: true, message: `Payment status updated to ${status}` });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update payment status' });
    }
};

module.exports = {
    createPayment,
    getAllPayments,
    getPaymentById,
    updatePaymentStatus,
    getMyPayments,
    getPaymentsByTournament
};
