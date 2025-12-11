/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const prisma = require('../../config/prisma');
const walletService = require('../wallet/wallet.service');

// Get dashboard stats
exports.getDashboard = async (req, res) => {
    try {
        const [
            totalUsers,
            totalHosts,
            totalTournaments,
            activeTournaments,
            totalTransactions,
            totalVolume,
            pendingWithdrawals,
            pendingKYC
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { hostStatus: 'VERIFIED' } }),
            prisma.tournament.count(),
            prisma.tournament.count({ where: { status: 'ONGOING' } }),
            prisma.transaction.count(),
            prisma.transaction.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 }, type: { in: ['DEPOSIT', 'ENTRY_FEE'] } } }),
            prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
            prisma.kYCRequest.count({ where: { status: 'PENDING' } })
        ]);

        res.json({
            success: true,
            data: {
                users: { total: totalUsers, hosts: totalHosts },
                tournaments: { total: totalTournaments, active: activeTournaments },
                transactions: { total: totalTransactions, volume: totalVolume._sum.amount || 0 },
                pending: { withdrawals: pendingWithdrawals, kyc: pendingKYC }
            }
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
    }
};

// List users
exports.listUsers = async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (role) where.role = role;
        if (search) {
            where.OR = [
                { username: { contains: search } },
                { email: { contains: search } }
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true, email: true, username: true, role: true,
                    hostStatus: true, isBanned: true, createdAt: true,
                    wallet: { select: { balance: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.user.count({ where })
        ]);

        res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Ban user
exports.banUser = async (req, res) => {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: req.params.id },
                data: { isBanned: true }
            });

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'USER_BANNED',
                    entity: 'user',
                    entityId: req.params.id
                }
            });
        });

        res.json({ success: true, message: 'User banned' });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ success: false, message: 'Failed to ban user' });
    }
};

// Unban user
exports.unbanUser = async (req, res) => {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: req.params.id },
                data: { isBanned: false }
            });

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'USER_UNBANNED',
                    entity: 'user',
                    entityId: req.params.id
                }
            });
        });

        res.json({ success: true, message: 'User unbanned' });
    } catch (error) {
        console.error('Unban user error:', error);
        res.status(500).json({ success: false, message: 'Failed to unban user' });
    }
};

// Update user role (SUPERADMIN only)
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['PLAYER', 'ADMIN', 'SUPERADMIN'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: req.params.id },
                data: { role }
            });

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'ROLE_CHANGED',
                    entity: 'user',
                    entityId: req.params.id,
                    meta: { newRole: role }
                }
            });
        });

        res.json({ success: true, message: `Role updated to ${role}` });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
};

// List withdrawals
exports.listWithdrawals = async (req, res) => {
    try {
        const { status = 'PENDING', page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;

        const withdrawals = await prisma.withdrawalRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
        });

        res.json({ success: true, data: withdrawals });
    } catch (error) {
        console.error('List withdrawals error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
    }
};

// Approve withdrawal
exports.approveWithdrawal = async (req, res) => {
    try {
        const withdrawal = await prisma.withdrawalRequest.findUnique({
            where: { id: req.params.id }
        });

        if (!withdrawal || withdrawal.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal' });
        }

        await prisma.$transaction(async (tx) => {
            // Deduct from wallet (was locked)
            await walletService.debit(
                withdrawal.userId,
                withdrawal.amount,
                'WITHDRAW',
                'Withdrawal approved',
                { withdrawalId: withdrawal.id },
                tx
            );

            // Unlock
            await walletService.unlockAmount(withdrawal.userId, withdrawal.amount, tx);

            await tx.withdrawalRequest.update({
                where: { id: withdrawal.id },
                data: { status: 'COMPLETED', processedAt: new Date() }
            });

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'WITHDRAWAL_APPROVED',
                    entity: 'withdrawal',
                    entityId: withdrawal.id,
                    meta: { userId: withdrawal.userId, amount: withdrawal.amount }
                }
            });
        });

        res.json({ success: true, message: 'Withdrawal approved' });
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve' });
    }
};

// Reject withdrawal
exports.rejectWithdrawal = async (req, res) => {
    try {
        const { reason } = req.body;

        const withdrawal = await prisma.withdrawalRequest.findUnique({
            where: { id: req.params.id }
        });

        if (!withdrawal || withdrawal.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal' });
        }

        await prisma.$transaction(async (tx) => {
            // Unlock amount
            await walletService.unlockAmount(withdrawal.userId, withdrawal.amount, tx);

            await tx.withdrawalRequest.update({
                where: { id: withdrawal.id },
                data: { status: 'REJECTED', adminNotes: reason, processedAt: new Date() }
            });

            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: 'WITHDRAWAL_REJECTED',
                    entity: 'withdrawal',
                    entityId: withdrawal.id,
                    meta: { userId: withdrawal.userId, reason }
                }
            });
        });

        res.json({ success: true, message: 'Withdrawal rejected' });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject' });
    }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
    try {
        const { action, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (action) where.action = action;

        const logs = await prisma.auditLog.findMany({
            where,
            include: { admin: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
};
