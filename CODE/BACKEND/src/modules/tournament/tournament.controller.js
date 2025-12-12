/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { tournaments, users, games, registrations } = require('../../db/schema');
const { eq, desc, and } = require('drizzle-orm');
const { z } = require('zod');
const crypto = require('crypto');

// Validation Schemas
const createTournamentSchema = z.object({
    name: z.string().min(3),
    game: z.string(),
    description: z.string().optional(),
    type: z.enum(['SOLO', 'DUO', 'SQUAD', 'TEAM']),
    teamSize: z.number().int().min(1),
    entryFee: z.number().int().min(0),
    prizePool: z.number().int().min(0),
    minTeamsRequired: z.number().int().min(2),
    startTime: z.string().transform(str => new Date(str)),
    registrationEnd: z.string().transform(str => new Date(str)),
});

const updateTournamentSchema = createTournamentSchema.partial();

// Create tournament
exports.createTournament = async (req, res) => {
    try {
        const data = createTournamentSchema.parse(req.body);

        // RBAC Check is handled by middleware, but logically Host/Admin only
        // The hostId will be the current user
        const result = await db.insert(tournaments).values({
            id: crypto.randomUUID(),
            ...data,
            hostId: req.user.id,
            status: 'UPCOMING',
            collected: 0,
            hostProfit: 0
        });

        res.status(201).json({
            success: true,
            message: 'Tournament created successfully',
            data: result // Note: MySQL insert result doesn't contain the row, handled by fetch below or UI reload
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        console.error('Create tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to create tournament' });
    }
};

// Get all tournaments
exports.getAllTournaments = async (req, res) => {
    try {
        const result = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            game: tournaments.game,
            description: tournaments.description,
            type: tournaments.type,
            teamSize: tournaments.teamSize,
            entryFee: tournaments.entryFee,
            prizePool: tournaments.prizePool,
            minTeamsRequired: tournaments.minTeamsRequired,
            status: tournaments.status,
            startTime: tournaments.startTime,
            registrationEnd: tournaments.registrationEnd,
            collected: tournaments.collected,
            createdAt: tournaments.createdAt,
            host: {
                id: users.id,
                username: users.username
            }
        })
            .from(tournaments)
            .leftJoin(users, eq(tournaments.hostId, users.id))
            .orderBy(desc(tournaments.createdAt));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get tournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
};

// Get tournament by ID
exports.getTournamentById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            game: tournaments.game,
            description: tournaments.description,
            type: tournaments.type,
            teamSize: tournaments.teamSize,
            entryFee: tournaments.entryFee,
            prizePool: tournaments.prizePool,
            minTeamsRequired: tournaments.minTeamsRequired,
            status: tournaments.status,
            startTime: tournaments.startTime,
            registrationEnd: tournaments.registrationEnd,
            collected: tournaments.collected,
            createdAt: tournaments.createdAt,
            host: {
                id: users.id,
                username: users.username
            }
        })
            .from(tournaments)
            .leftJoin(users, eq(tournaments.hostId, users.id))
            .where(eq(tournaments.id, id))
            .limit(1);

        if (!result[0]) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error('Get tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournament' });
    }
};

// Update tournament
exports.updateTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const data = updateTournamentSchema.parse(req.body);

        // Security: Check if user owns the tournament or is Admin
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!tournament[0]) return res.status(404).json({ success: false, message: 'Tournament not found' });

        if (tournament[0].hostId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized to update this tournament' });
        }

        await db.update(tournaments)
            .set(data)
            .where(eq(tournaments.id, id));

        res.json({ success: true, message: 'Tournament updated successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        console.error('Update tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to update tournament' });
    }
};

// Delete tournament
exports.deleteTournament = async (req, res) => {
    try {
        const { id } = req.params;

        // Security: Check ownership
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!tournament[0]) return res.status(404).json({ success: false, message: 'Tournament not found' });

        if (tournament[0].hostId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this tournament' });
        }

        await db.delete(tournaments).where(eq(tournaments.id, id));

        res.json({ success: true, message: 'Tournament deleted successfully' });
    } catch (error) {
        console.error('Delete tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete tournament' });
    }
};

// Join tournament
exports.joinTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if tournament exists and is open
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!tournament[0]) return res.status(404).json({ success: false, message: 'Tournament not found' });
        if (tournament[0].status !== 'UPCOMING') return res.status(400).json({ success: false, message: 'Tournament is not open for registration' });

        // Check already registered
        const existing = await db.select().from(registrations)
            .where(and(eq(registrations.tournamentId, id), eq(registrations.userId, userId)))
            .limit(1);

        if (existing[0]) return res.status(400).json({ success: false, message: 'Already registered' });

        // Register
        await db.insert(registrations).values({
            id: crypto.randomUUID(),
            tournamentId: id,
            userId: userId,
            status: 'PENDING',
            paymentStatus: 'PENDING' // Assuming payment integration comes later or is free
        });

        res.status(201).json({ success: true, message: 'Successfully joined tournament' });

    } catch (error) {
        console.error('Join tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to join tournament' });
    }
};

// Leave tournament
exports.leaveTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check registration
        const registration = await db.select().from(registrations)
            .where(and(eq(registrations.tournamentId, id), eq(registrations.userId, userId)))
            .limit(1);

        if (!registration[0]) return res.status(400).json({ success: false, message: 'Not registered for this tournament' });

        await db.delete(registrations)
            .where(and(eq(registrations.tournamentId, id), eq(registrations.userId, userId)));

        res.json({ success: true, message: 'Successfully left tournament' });

    } catch (error) {
        console.error('Leave tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to leave tournament' });
    }
};

// Get participants
exports.getParticipants = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.select({
            registrationId: registrations.id,
            status: registrations.status,
            user: {
                id: users.id,
                username: users.username
            }
        })
            .from(registrations)
            .leftJoin(users, eq(registrations.userId, users.id))
            .where(eq(registrations.tournamentId, id));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch participants' });
    }
};

// Get tournaments by host
exports.getTournamentsByHost = async (req, res) => {
    try {
        const { hostId } = req.params;
        const result = await db.select().from(tournaments).where(eq(tournaments.hostId, hostId));
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get host tournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
};


// Stubs for future use
const stubHandler = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'This feature is currently under maintenance'
    });
};

module.exports = {
    createTournament: exports.createTournament,
    getAllTournaments: exports.getAllTournaments,
    getTournamentById: exports.getTournamentById,
    updateTournament: exports.updateTournament,
    deleteTournament: exports.deleteTournament,
    joinTournament: exports.joinTournament,
    leaveTournament: exports.leaveTournament,
    getParticipants: exports.getParticipants,
    getTournamentsByHost: exports.getTournamentsByHost,

    // Remaining stubs
    registerTeam: stubHandler, // For team-based joining
    getTournamentRegistrations: exports.getParticipants, // Reuse
    startTournament: stubHandler,
    submitResult: stubHandler,
    finalizeTournament: stubHandler,
    updateParticipantStatus: stubHandler,
    declareWinners: stubHandler,
    getWinners: stubHandler
};
