const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schemas
const createTournamentSchema = z.object({
    name: z.string().min(3, 'Tournament name must be at least 3 characters'),
    description: z.string().optional(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
    gameType: z.string().optional(),
    joiningFee: z.number().int().min(0).optional(),
    imageUrl: z.string().url().optional()
});

// Get all tournaments
exports.getAllTournaments = async (req, res) => {
    try {
        const { gameType, isActive, page = 1, limit = 10 } = req.query;

        const where = {};
        if (gameType) where.gameType = gameType;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [tournaments, total] = await Promise.all([
            prisma.tournament.findMany({
                where,
                include: {
                    host: {
                        select: { id: true, fullName: true, email: true, imageUrl: true }
                    },
                    _count: {
                        select: { participants: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.tournament.count({ where })
        ]);

        res.json({
            success: true,
            data: tournaments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get tournaments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tournaments'
        });
    }
};

// Get single tournament
exports.getTournamentById = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                host: {
                    select: { id: true, fullName: true, email: true, imageUrl: true }
                },
                participants: {
                    include: {
                        user: {
                            select: { id: true, fullName: true, email: true, imageUrl: true }
                        }
                    }
                },
                winners: {
                    include: {
                        player: {
                            select: { id: true, fullName: true, email: true, imageUrl: true }
                        }
                    },
                    orderBy: { rank: 'asc' }
                }
            }
        });

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        res.json({
            success: true,
            data: tournament
        });
    } catch (error) {
        console.error('Get tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tournament'
        });
    }
};

// Create tournament (HOST only)
exports.createTournament = async (req, res) => {
    try {
        const validatedData = createTournamentSchema.parse(req.body);

        const tournament = await prisma.tournament.create({
            data: {
                ...validatedData,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                hostId: req.user.id
            },
            include: {
                host: {
                    select: { id: true, fullName: true, email: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Tournament created successfully',
            data: tournament
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Create tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create tournament'
        });
    }
};

// Update tournament (HOST only - owner)
exports.updateTournament = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        // Check ownership
        const existing = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (existing.hostId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own tournaments'
            });
        }

        const updateData = {};
        const { name, description, startDate, endDate, gameType, joiningFee, isActive, imageUrl } = req.body;

        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate) updateData.endDate = new Date(endDate);
        if (gameType !== undefined) updateData.gameType = gameType;
        if (joiningFee !== undefined) updateData.joiningFee = joiningFee;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

        const tournament = await prisma.tournament.update({
            where: { id: tournamentId },
            data: updateData,
            include: {
                host: {
                    select: { id: true, fullName: true, email: true }
                }
            }
        });

        res.json({
            success: true,
            message: 'Tournament updated successfully',
            data: tournament
        });
    } catch (error) {
        console.error('Update tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tournament'
        });
    }
};

// Delete tournament (HOST only - owner)
exports.deleteTournament = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        const existing = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (existing.hostId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own tournaments'
            });
        }

        await prisma.tournament.delete({
            where: { id: tournamentId }
        });

        res.json({
            success: true,
            message: 'Tournament deleted successfully'
        });
    } catch (error) {
        console.error('Delete tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tournament'
        });
    }
};

// Join tournament (PLAYER only)
exports.joinTournament = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        // Check if tournament exists and is active
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (!tournament.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Tournament is not active'
            });
        }

        // Check if already joined
        const existing = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: {
                    tournamentId,
                    userId: req.user.id
                }
            }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You have already joined this tournament'
            });
        }

        const participant = await prisma.tournamentParticipant.create({
            data: {
                tournamentId,
                userId: req.user.id,
                status: 'PENDING'
            },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true }
                },
                tournament: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Successfully requested to join tournament',
            data: participant
        });
    } catch (error) {
        console.error('Join tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join tournament'
        });
    }
};

// Leave tournament (PLAYER only)
exports.leaveTournament = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        const participant = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: {
                    tournamentId,
                    userId: req.user.id
                }
            }
        });

        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'You are not a participant in this tournament'
            });
        }

        await prisma.tournamentParticipant.delete({
            where: { id: participant.id }
        });

        res.json({
            success: true,
            message: 'Successfully left the tournament'
        });
    } catch (error) {
        console.error('Leave tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to leave tournament'
        });
    }
};

// Get participants (HOST only - owner)
exports.getParticipants = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        const participants = await prisma.tournamentParticipant.findMany({
            where: { tournamentId },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, mobile: true, imageUrl: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: participants
        });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch participants'
        });
    }
};

// Update participant status (HOST only)
exports.updateParticipantStatus = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const participantId = parseInt(req.params.participantId);
        const { status, rejectionReason } = req.body;

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
                message: 'You can only manage participants for your own tournaments'
            });
        }

        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'DISQUALIFIED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const participant = await prisma.tournamentParticipant.update({
            where: { id: participantId },
            data: {
                status,
                rejectionReason: status === 'REJECTED' ? rejectionReason : null
            },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true }
                }
            }
        });

        res.json({
            success: true,
            message: `Participant ${status.toLowerCase()} successfully`,
            data: participant
        });
    } catch (error) {
        console.error('Update participant status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update participant status'
        });
    }
};

// Declare winners (HOST only)
exports.declareWinners = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const { winners } = req.body; // Array of { playerId, rank, prizeAmount, remarks }

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
                message: 'You can only declare winners for your own tournaments'
            });
        }

        // Delete existing winners first
        await prisma.tournamentWinner.deleteMany({
            where: { tournamentId }
        });

        // Create new winners
        const createdWinners = await prisma.tournamentWinner.createMany({
            data: winners.map((w) => ({
                tournamentId,
                playerId: w.playerId,
                rank: w.rank,
                prizeAmount: w.prizeAmount,
                remarks: w.remarks
            }))
        });

        // Mark tournament as inactive
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { isActive: false }
        });

        const allWinners = await prisma.tournamentWinner.findMany({
            where: { tournamentId },
            include: {
                player: {
                    select: { id: true, fullName: true, email: true, imageUrl: true }
                }
            },
            orderBy: { rank: 'asc' }
        });

        res.json({
            success: true,
            message: 'Winners declared successfully',
            data: allWinners
        });
    } catch (error) {
        console.error('Declare winners error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to declare winners'
        });
    }
};

// Get winners
exports.getWinners = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        const winners = await prisma.tournamentWinner.findMany({
            where: { tournamentId },
            include: {
                player: {
                    select: { id: true, fullName: true, email: true, imageUrl: true }
                }
            },
            orderBy: { rank: 'asc' }
        });

        res.json({
            success: true,
            data: winners
        });
    } catch (error) {
        console.error('Get winners error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch winners'
        });
    }
};

// Get tournaments by host
exports.getTournamentsByHost = async (req, res) => {
    try {
        const hostId = parseInt(req.params.hostId);

        const tournaments = await prisma.tournament.findMany({
            where: { hostId },
            include: {
                _count: {
                    select: { participants: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: tournaments
        });
    } catch (error) {
        console.error('Get tournaments by host error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tournaments'
        });
    }
};
