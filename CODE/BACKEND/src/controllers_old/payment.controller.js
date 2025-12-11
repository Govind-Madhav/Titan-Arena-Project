/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schema
const createPaymentSchema = z.object({
    tournamentId: z.number().int().positive(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['CARD', 'UPI']),
    // Card details (optional)
    cardNumber: z.string().optional(),
    cardExpiryDate: z.string().optional(),
    cardCVC: z.string().optional(),
    // UPI details (optional)
    upiId: z.string().optional()
});

// Create payment (PLAYER)
exports.createPayment = async (req, res) => {
    try {
        const validatedData = createPaymentSchema.parse(req.body);

        // Check tournament exists
        const tournament = await prisma.tournament.findUnique({
            where: { id: validatedData.tournamentId }
        });

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        // Check if player is a participant
        const participant = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: {
                    tournamentId: validatedData.tournamentId,
                    userId: req.user.id
                }
            }
        });

        if (!participant || participant.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'You must be an approved participant to make payment'
            });
        }

        // Check for existing payment
        const existingPayment = await prisma.payment.findFirst({
            where: {
                playerId: req.user.id,
                tournamentId: validatedData.tournamentId,
                status: true
            }
        });

        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: 'Payment already completed for this tournament'
            });
        }

        // Generate transaction ID
        const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const payment = await prisma.payment.create({
            data: {
                playerId: req.user.id,
                tournamentId: validatedData.tournamentId,
                amount: validatedData.amount,
                paymentMethod: validatedData.paymentMethod,
                transactionId,
                status: true, // Mark as successful for now (mock payment)
                cardNumber: validatedData.cardNumber ? validatedData.cardNumber.slice(-4) : null,
                cardExpiryDate: validatedData.cardExpiryDate,
                cardCVC: null, // Never store CVC
                upiId: validatedData.upiId
            },
            include: {
                player: {
                    select: { id: true, fullName: true, email: true }
                },
                tournament: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Payment successful',
            data: payment
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Create payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment failed'
        });
    }
};

// Get my payments (PLAYER)
exports.getMyPayments = async (req, res) => {
    try {
        const payments = await prisma.payment.findMany({
            where: { playerId: req.user.id },
            include: {
                tournament: {
                    select: { id: true, name: true, gameType: true, imageUrl: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Get my payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
};

// Get payments by tournament (HOST)
exports.getPaymentsByTournament = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.tournamentId);

        // Verify host ownership
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.hostId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const payments = await prisma.payment.findMany({
            where: { tournamentId },
            include: {
                player: {
                    select: { id: true, fullName: true, email: true, mobile: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Get tournament payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
};

// Get all payments (ADMIN)
exports.getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                include: {
                    player: {
                        select: { id: true, fullName: true, email: true }
                    },
                    tournament: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.payment.count()
        ]);

        res.json({
            success: true,
            data: payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
};

// Update payment status (HOST/ADMIN)
exports.updatePaymentStatus = async (req, res) => {
    try {
        const paymentId = parseInt(req.params.id);
        const { status } = req.body;

        const payment = await prisma.payment.update({
            where: { id: paymentId },
            data: { status },
            include: {
                player: {
                    select: { id: true, fullName: true, email: true }
                },
                tournament: {
                    select: { id: true, name: true }
                }
            }
        });

        res.json({
            success: true,
            message: `Payment status updated`,
            data: payment
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status'
        });
    }
};
