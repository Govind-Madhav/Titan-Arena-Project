/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { tournaments, users, games, registrations, matches } = require('../../db/schema');
const { eq, desc, and } = require('drizzle-orm');
const { z } = require('zod');
const crypto = require('crypto');
const walletService = require('../wallet/wallet.service');
const auditService = require('../admin/audit.service');

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
    // Start Tournament (Bracket Generation)
    startTournament: async (req, res) => {
        try {
            const { id } = req.params;

            // 1. Fetch Tournament & Participants
            const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
            if (!tournament[0]) return res.status(404).json({ success: false, message: 'Tournament not found' });

            // Security: Only Host or Admin
            if (tournament[0].hostId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            // Check Status
            // Allow starting if UPCOMING or REGISTRATION (flexible)
            if (tournament[0].status === 'ONGOING' || tournament[0].status === 'COMPLETED') {
                return res.status(400).json({ success: false, message: 'Tournament already started or completed' });
            }

            const participants = await db.select().from(registrations)
                .where(and(eq(registrations.tournamentId, id), eq(registrations.status, 'CONFIRMED'))); // Only confirmed players

            if (participants.length < 2) {
                return res.status(400).json({ success: false, message: 'Need at least 2 participants to start' });
            }

            // 2. Shuffle & Seed
            // Simple shuffle
            const shuffled = participants.map(p => ({
                id: p.userId || p.teamId, // Handle both user/team
                name: 'TBD' // Ideally fetch names, but ID is enough for logic
            })).sort(() => Math.random() - 0.5);

            const participantCount = shuffled.length;
            const rounds = Math.ceil(Math.log2(participantCount));
            const bracketSize = Math.pow(2, rounds);
            const byes = bracketSize - participantCount;

            // 3. Generate Bracket Matches
            // Strategy: Create all matches for the tree.
            // Example 8 players -> 7 matches (4 QF, 2 SF, 1 F)
            // Round 1 matches: bracketSize / 2

            const matchesToCreate = [];

            // We need to keep track of created matches to link them
            // Key: "round_matchNumber" -> uuid
            const matchMap = new Map();

            // Generate matches from Final backwards or Round 1 forwards? 
            // For linking nextMatchId, easier to generate Final first (Round = rounds), then track backwards?
            // Or generate forwards and update? 
            // Better: Generate IDs upfront.

            // Let's generate systematically by Round 1 to Final.
            // But we need nextMatchIds.
            // Formula for Next match: 
            // If current match is Round R, Match M
            // Next match is Round R+1, Match ceil(M/2)
            // Position: if M is odd -> 1, if even -> 2

            // Generate IDs for all matches
            let currentRoundMatches = bracketSize / 2;
            for (let r = 1; r <= rounds; r++) {
                for (let m = 1; m <= currentRoundMatches; m++) {
                    matchMap.set(`${r}_${m}`, crypto.randomUUID());
                }
                currentRoundMatches /= 2;
            }

            // Now create match objects
            currentRoundMatches = bracketSize / 2;
            for (let r = 1; r <= rounds; r++) {
                for (let m = 1; m <= currentRoundMatches; m++) {
                    const matchId = matchMap.get(`${r}_${m}`);
                    let nextMatchId = null;
                    let positionInNextMatch = null;

                    if (r < rounds) {
                        const nextM = Math.ceil(m / 2);
                        nextMatchId = matchMap.get(`${r + 1}_${nextM}`);
                        positionInNextMatch = m % 2 === 1 ? 1 : 2;
                    }

                    // For Round 1, assign participants
                    let participantAId = null;
                    let participantBId = null;
                    let isBye = false;
                    let status = 'SCHEDULED';
                    let winnerId = null;

                    if (r === 1) {
                        // Slot 1 (A) index: (m-1)*2
                        // Slot 2 (B) index: (m-1)*2 + 1
                        const slotAIndex = (m - 1) * 2;
                        const slotBIndex = (m - 1) * 2 + 1;

                        if (slotAIndex < shuffled.length) participantAId = shuffled[slotAIndex].id;

                        // Handle BYE logic: If we have BYEs, usually the highest seeds get them. 
                        // In random shuffle, later slots get "empty". 
                        // If bracketSize > count, slots > count are empty.
                        // Wait, Standard bye logic: The layout should put byes such that they meet late.
                        // Simple logic: Just fill slots. If Slot B is empty -> BYE.

                        if (slotBIndex < shuffled.length) {
                            participantBId = shuffled[slotBIndex].id;
                        } else {
                            // BYE
                            isBye = true;
                            status = 'COMPLETED'; // Auto-advance? Next logic handles it. 
                            // Actually, let's mark it COMPLETED here so logic picks it up, 
                            // OR keep SCHEDULED and let immediate process handle it.
                            // Let's set Winner immediately.
                            winnerId = participantAId;
                        }
                    }

                    matchesToCreate.push({
                        id: matchId,
                        tournamentId: id,
                        round: r,
                        matchNumber: m,
                        participantAId,
                        participantBId,
                        nextMatchId,
                        positionInNextMatch,
                        status,
                        isBye,
                        winnerId // Set if BYE
                    });
                }
                currentRoundMatches /= 2;
            }

            // Database Updates
            await db.transaction(async (tx) => {
                // Bulk insert matches
                // Drizzle's MySQL insert doesn't support bulk well with unique UUIDs generated in JS? 
                // We generated IDs in JS. 
                // We can use Promise.all or loop. Bulk insert usually preferred.
                // Drizzle values() accepts array.

                await tx.insert(matches).values(matchesToCreate);

                // Update Tournament Status
                await tx.update(tournaments)
                    .set({
                        status: 'ONGOING',
                        totalRounds: rounds,
                        currentRound: 1
                    })
                    .where(eq(tournaments.id, id));

                // Advance BYE winners immediately
                // We already set winnerId for BYEs, but we need to propagate them to next round.
                // We can loop through the created matchesToCreate, find BYEs, and update the next match.
                // OR relies on "advanceWinner" logic. 
                // Since this is initialization, standard `advanceWinner` might be safer but circular dep? 
                // Let's do it manually here for efficiency in the transaction.

                const byes = matchesToCreate.filter(m => m.isBye && m.winnerId);
                for (const byeMatch of byes) {
                    if (byeMatch.nextMatchId) {
                        // We need to find the specific match UUID in matchesToCreate (or DB) and update it.
                        // Update DB directly since we just inserted.
                        const updateField = byeMatch.positionInNextMatch === 1 ? 'participantAId' : 'participantBId';
                        await tx.update(matches)
                            .set({ [updateField]: byeMatch.winnerId })
                            .where(eq(matches.id, byeMatch.nextMatchId));
                    }
                }

                // Log Audit
                await auditService.logAction(req.user.id, 'TOURNAMENT_START', id, {
                    rounds,
                    participants: participantCount
                });
            });

            res.json({ success: true, message: 'Tournament started and bracket generated', rounds });

        } catch (error) {
            console.error('Start tournament error:', error);
            res.status(500).json({ success: false, message: 'Failed to start tournament' });
        }
    },

    submitResult: stubHandler,

    // Finalize tournament and distribute prizes
    finalizeTournament: async (req, res) => {
        try {
            const { id } = req.params;

            // Security: Check ownership
            const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
            if (!tournament[0]) return res.status(404).json({ success: false, message: 'Tournament not found' });

            if (tournament[0].hostId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            // Distribute prizes
            await walletService.distributeTournamentPrizes(id);

            res.json({ success: true, message: 'Tournament finalized and prizes distributed' });
        } catch (error) {
            console.error('Finalize tournament error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to finalize tournament' });
        }
    },

    updateParticipantStatus: stubHandler,
    declareWinners: stubHandler,
    getWinners: stubHandler
};
