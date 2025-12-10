const prisma = require('../../config/prisma');
const walletService = require('../wallet/wallet.service');
const { z } = require('zod');

// Create tournament
exports.createTournament = async (req, res) => {
    try {
        const schema = z.object({
            name: z.string().min(3).max(100),
            game: z.string().min(2).max(50),
            description: z.string().optional(),
            type: z.enum(['SOLO', 'TEAM']),
            teamSize: z.number().int().min(2).max(10).optional(),
            entryFee: z.number().int().min(0),
            prizePool: z.number().int().min(0),
            payouts: z.array(z.object({
                position: z.number().int().min(1),
                amount: z.number().int().min(0)
            })),
            startTime: z.string().datetime(),
            registrationEnd: z.string().datetime(),
            insufficientRegPolicy: z.enum(['CANCEL', 'POSTPONE']).optional().default('CANCEL')
        });

        const data = schema.parse(req.body);

        // Validate team size for TEAM type
        if (data.type === 'TEAM' && !data.teamSize) {
            return res.status(400).json({
                success: false,
                message: 'Team size is required for team tournaments'
            });
        }

        // Validate payout sum equals prize pool
        const payoutSum = data.payouts.reduce((sum, p) => sum + p.amount, 0);
        if (payoutSum !== data.prizePool) {
            return res.status(400).json({
                success: false,
                message: `Payout sum (${payoutSum}) must equal prize pool (${data.prizePool})`
            });
        }

        // Calculate minimum registrations required
        const minTeamsRequired = data.entryFee > 0
            ? Math.ceil(data.prizePool / data.entryFee)
            : 2;

        const tournament = await prisma.$transaction(async (tx) => {
            const t = await tx.tournament.create({
                data: {
                    name: data.name,
                    game: data.game,
                    description: data.description,
                    type: data.type,
                    teamSize: data.teamSize,
                    hostId: req.user.id,
                    entryFee: data.entryFee,
                    prizePool: data.prizePool,
                    minTeamsRequired,
                    insufficientRegPolicy: data.insufficientRegPolicy,
                    startTime: new Date(data.startTime),
                    registrationEnd: new Date(data.registrationEnd)
                }
            });

            // Create payouts
            await tx.payout.createMany({
                data: data.payouts.map(p => ({
                    tournamentId: t.id,
                    position: p.position,
                    amount: p.amount
                }))
            });

            return t;
        });

        res.status(201).json({
            success: true,
            message: 'Tournament created',
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

// List tournaments
exports.listTournaments = async (req, res) => {
    try {
        const { game, status, type, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (game) where.game = game;
        if (status) where.status = status;
        if (type) where.type = type;

        const [tournaments, total] = await Promise.all([
            prisma.tournament.findMany({
                where,
                include: {
                    host: { select: { id: true, username: true } },
                    payouts: { orderBy: { position: 'asc' } },
                    _count: { select: { registrations: true } }
                },
                orderBy: { startTime: 'asc' },
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
        console.error('List tournaments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tournaments'
        });
    }
};

// Get single tournament
exports.getTournament = async (req, res) => {
    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: {
                host: { select: { id: true, username: true } },
                payouts: { orderBy: { position: 'asc' } },
                registrations: {
                    where: { status: 'CONFIRMED' },
                    include: {
                        user: { select: { id: true, username: true } },
                        team: { select: { id: true, name: true } }
                    }
                },
                matches: { orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }] }
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

// Update tournament
exports.updateTournament = async (req, res) => {
    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id }
        });

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (tournament.status !== 'UPCOMING') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update tournament after it has started'
            });
        }

        const allowedFields = ['name', 'description', 'startTime', 'registrationEnd'];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = field.includes('Time') || field.includes('End')
                    ? new Date(req.body[field])
                    : req.body[field];
            }
        }

        const updated = await prisma.tournament.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Tournament updated',
            data: updated
        });
    } catch (error) {
        console.error('Update tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tournament'
        });
    }
};

// Register for tournament
exports.register = async (req, res) => {
    try {
        const { teamId } = req.body;
        const tournamentId = req.params.id;

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return res.status(404).json({
                success: false,
                message: 'Tournament not found'
            });
        }

        if (tournament.status !== 'UPCOMING') {
            return res.status(400).json({
                success: false,
                message: 'Registration is closed'
            });
        }

        if (new Date() > tournament.registrationEnd) {
            return res.status(400).json({
                success: false,
                message: 'Registration deadline has passed'
            });
        }

        // Check for SOLO vs TEAM
        if (tournament.type === 'TEAM') {
            if (!teamId) {
                return res.status(400).json({
                    success: false,
                    message: 'Team ID required for team tournament'
                });
            }

            const team = await prisma.team.findUnique({
                where: { id: teamId },
                include: { members: true }
            });

            if (!team) {
                return res.status(404).json({
                    success: false,
                    message: 'Team not found'
                });
            }

            if (team.captainId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Only captain can register team'
                });
            }

            if (team.members.length < tournament.teamSize) {
                return res.status(400).json({
                    success: false,
                    message: `Team needs ${tournament.teamSize} members`
                });
            }

            // Check existing team registration
            const existing = await prisma.registration.findFirst({
                where: { tournamentId, teamId }
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Team already registered'
                });
            }

            // Deduct from captain's wallet and register
            await prisma.$transaction(async (tx) => {
                await walletService.debit(
                    req.user.id,
                    tournament.entryFee,
                    'ENTRY_FEE',
                    `Entry fee for ${tournament.name}`,
                    { tournamentId },
                    tx
                );

                await tx.registration.create({
                    data: {
                        tournamentId,
                        teamId,
                        status: 'CONFIRMED'
                    }
                });

                await tx.tournament.update({
                    where: { id: tournamentId },
                    data: { collected: { increment: tournament.entryFee } }
                });
            });
        } else {
            // SOLO registration
            const existing = await prisma.registration.findFirst({
                where: { tournamentId, userId: req.user.id }
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Already registered'
                });
            }

            await prisma.$transaction(async (tx) => {
                await walletService.debit(
                    req.user.id,
                    tournament.entryFee,
                    'ENTRY_FEE',
                    `Entry fee for ${tournament.name}`,
                    { tournamentId },
                    tx
                );

                await tx.registration.create({
                    data: {
                        tournamentId,
                        userId: req.user.id,
                        status: 'CONFIRMED'
                    }
                });

                await tx.tournament.update({
                    where: { id: tournamentId },
                    data: { collected: { increment: tournament.entryFee } }
                });
            });
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
};

// Unregister
exports.unregister = async (req, res) => {
    try {
        const tournamentId = req.params.id;

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament || tournament.status !== 'UPCOMING') {
            return res.status(400).json({
                success: false,
                message: 'Cannot unregister at this stage'
            });
        }

        const registration = await prisma.registration.findFirst({
            where: {
                tournamentId,
                OR: [
                    { userId: req.user.id },
                    { team: { captainId: req.user.id } }
                ]
            }
        });

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        await prisma.$transaction(async (tx) => {
            // Refund
            await walletService.credit(
                req.user.id,
                tournament.entryFee,
                'REFUND',
                `Refund for ${tournament.name}`,
                { tournamentId },
                tx
            );

            await tx.registration.delete({
                where: { id: registration.id }
            });

            await tx.tournament.update({
                where: { id: tournamentId },
                data: { collected: { decrement: tournament.entryFee } }
            });
        });

        res.json({
            success: true,
            message: 'Unregistered and refunded'
        });
    } catch (error) {
        console.error('Unregister error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unregister'
        });
    }
};

// Get participants
exports.getParticipants = async (req, res) => {
    try {
        const registrations = await prisma.registration.findMany({
            where: {
                tournamentId: req.params.id,
                status: 'CONFIRMED'
            },
            include: {
                user: { select: { id: true, username: true } },
                team: {
                    include: {
                        members: {
                            include: {
                                user: { select: { id: true, username: true } }
                            }
                        }
                    }
                }
            }
        });

        res.json({
            success: true,
            data: registrations
        });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch participants'
        });
    }
};

// Cancel tournament
exports.cancelTournament = async (req, res) => {
    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: { registrations: { where: { status: 'CONFIRMED' } } }
        });

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await prisma.$transaction(async (tx) => {
            // Refund all participants
            for (const reg of tournament.registrations) {
                const userId = reg.userId || (await tx.team.findUnique({ where: { id: reg.teamId } }))?.captainId;
                if (userId) {
                    await walletService.credit(userId, tournament.entryFee, 'REFUND', 'Tournament canceled', { tournamentId: tournament.id }, tx);
                }
            }

            await tx.tournament.update({
                where: { id: tournament.id },
                data: { status: 'CANCELED', collected: 0 }
            });
        });

        res.json({ success: true, message: 'Tournament canceled and refunds processed' });
    } catch (error) {
        console.error('Cancel tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel' });
    }
};

// Postpone tournament
exports.postponeTournament = async (req, res) => {
    try {
        const { newStartTime, newRegistrationEnd } = req.body;

        await prisma.tournament.update({
            where: { id: req.params.id },
            data: {
                status: 'POSTPONED',
                startTime: newStartTime ? new Date(newStartTime) : undefined,
                registrationEnd: newRegistrationEnd ? new Date(newRegistrationEnd) : undefined
            }
        });

        res.json({ success: true, message: 'Tournament postponed' });
    } catch (error) {
        console.error('Postpone error:', error);
        res.status(500).json({ success: false, message: 'Failed to postpone' });
    }
};

// Close registration (check min teams)
exports.closeRegistration = async (req, res) => {
    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: { registrations: { where: { status: 'CONFIRMED' } } }
        });

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const count = tournament.registrations.length;

        if (count < tournament.minTeamsRequired) {
            if (tournament.insufficientRegPolicy === 'CANCEL') {
                // Cancel and refund
                await exports.cancelTournament(req, res);
                return;
            } else {
                // Postpone
                await prisma.tournament.update({
                    where: { id: tournament.id },
                    data: { status: 'POSTPONED' }
                });
                return res.json({ success: true, message: 'Insufficient registrations. Tournament postponed.' });
            }
        }

        await prisma.tournament.update({
            where: { id: tournament.id },
            data: { status: 'ONGOING' }
        });

        res.json({ success: true, message: 'Registration closed. Tournament is now ONGOING.' });
    } catch (error) {
        console.error('Close registration error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// Generate bracket (stub - to be implemented in match module)
exports.generateBracket = async (req, res) => {
    res.json({ success: true, message: 'Use /matches/generate-bracket endpoint' });
};

// Complete tournament (stub - payout logic in match module)
exports.completeTournament = async (req, res) => {
    res.json({ success: true, message: 'Use /matches/:id/complete endpoint to trigger payout' });
};
