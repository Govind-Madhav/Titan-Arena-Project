const prisma = require('../../config/prisma');
const { z } = require('zod');

// Create dispute
exports.createDispute = async (req, res) => {
    try {
        const schema = z.object({
            reason: z.string().min(10, 'Reason must be at least 10 characters'),
            evidenceUrl: z.string().url().optional()
        });

        const data = schema.parse(req.body);

        const match = await prisma.match.findUnique({
            where: { id: req.params.matchId }
        });

        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found' });
        }

        if (match.status === 'DISPUTED') {
            return res.status(400).json({ success: false, message: 'Match already has an open dispute' });
        }

        const dispute = await prisma.$transaction(async (tx) => {
            const d = await tx.dispute.create({
                data: {
                    matchId: match.id,
                    raisedById: req.user.id,
                    reason: data.reason,
                    evidenceUrl: data.evidenceUrl,
                    status: 'OPEN'
                }
            });

            await tx.match.update({
                where: { id: match.id },
                data: { status: 'DISPUTED' }
            });

            return d;
        });

        res.status(201).json({
            success: true,
            message: 'Dispute raised',
            data: dispute
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        console.error('Create dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to create dispute' });
    }
};

// Get my disputes
exports.getMyDisputes = async (req, res) => {
    try {
        const disputes = await prisma.dispute.findMany({
            where: { raisedById: req.user.id },
            include: { match: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: disputes });
    } catch (error) {
        console.error('Get my disputes error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
    }
};

// Admin: List disputes
exports.listDisputes = async (req, res) => {
    try {
        const { status = 'OPEN', page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;

        const [disputes, total] = await Promise.all([
            prisma.dispute.findMany({
                where,
                include: {
                    match: { include: { tournament: { select: { id: true, name: true } } } },
                    raisedBy: { select: { id: true, username: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.dispute.count({ where })
        ]);

        res.json({
            success: true,
            data: disputes,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (error) {
        console.error('List disputes error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
    }
};

// Admin: Resolve dispute
exports.resolveDispute = async (req, res) => {
    try {
        const { resolution, overrideWinnerId } = req.body;

        if (!resolution) {
            return res.status(400).json({ success: false, message: 'Resolution is required' });
        }

        const dispute = await prisma.dispute.findUnique({
            where: { id: req.params.id },
            include: { match: { include: { tournament: true } } }
        });

        if (!dispute) {
            return res.status(404).json({ success: false, message: 'Dispute not found' });
        }

        await prisma.$transaction(async (tx) => {
            // Update dispute
            await tx.dispute.update({
                where: { id: dispute.id },
                data: {
                    status: 'RESOLVED',
                    resolution,
                    resolvedAt: new Date()
                }
            });

            // Update match
            const matchUpdate = { status: 'COMPLETED' };
            if (overrideWinnerId) {
                if (dispute.match.tournament.type === 'SOLO') {
                    matchUpdate.winnerUserId = overrideWinnerId;
                } else {
                    matchUpdate.winnerTeamId = overrideWinnerId;
                }
            }

            await tx.match.update({
                where: { id: dispute.matchId },
                data: matchUpdate
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    adminId: req.user.id,
                    action: overrideWinnerId ? 'MATCH_RESULT_OVERRIDE' : 'DISPUTE_RESOLVED',
                    entity: 'dispute',
                    entityId: dispute.id,
                    meta: { matchId: dispute.matchId, resolution, overrideWinnerId }
                }
            });
        });

        res.json({ success: true, message: 'Dispute resolved' });
    } catch (error) {
        console.error('Resolve dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
    }
};
