/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { tournaments, registrations, users, playerProfiles } = require('../../db/schema');
const { eq, and, desc, sql } = require('drizzle-orm');

// Create new tournament
const createTournament = async (req, res) => {
    try {
        const { name, game, type, schedule, entryFee, prizePool, maxParticipants, minParticipants, rules, description } = req.body;

        await db.insert(tournaments).values({
            hostId: req.user.id,
            name,
            game,
            type,
            startTime: new Date(schedule),
            entryFee: Number(entryFee),
            prizePool: Number(prizePool), // Store simply as number, distribution handled elsewhere if needed
            maxParticipants: Number(maxParticipants),
            minParticipants: Number(minParticipants) || 2,
            rules,
            description,
            status: 'REGISTRATION'
        });

        res.status(201).json({ success: true, message: 'Tournament created successfully' });
    } catch (error) {
        console.error('Create tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to create tournament' });
    }
};

// Get all tournaments (Public)
const getAllTournaments = async (req, res) => {
    try {
        const result = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
};

// Get single tournament
const getTournamentById = async (req, res) => {
    try {
        const result = await db.select().from(tournaments).where(eq(tournaments.id, req.params.id));
        if (!result.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
        res.json({ success: true, data: result[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tournament' });
    }
};

// Get Host's Tournaments & Stats (ISOLATED: Uses req.user.id)
const getTournamentsByHost = async (req, res) => {
    try {
        const hostId = req.user.id;

        // Fetch tournaments belonging ONLY to this host
        const myTournaments = await db.select()
            .from(tournaments)
            .where(eq(tournaments.hostId, hostId))
            .orderBy(desc(tournaments.createdAt));

        // Calculate stats
        const activeTournaments = myTournaments.filter(t => ['REGISTRATION', 'ONGOING'].includes(t.status)).length;
        const totalPrizePool = myTournaments.reduce((sum, t) => sum + Number(t.prizePool || 0), 0);

        // Get total players across all tournaments
        // Simple count of valid registrations for these tournaments
        let totalPlayers = 0;
        if (myTournaments.length > 0) {
            const tournamentIds = myTournaments.map(t => t.id);
            // This is a simplified count. For exact unique players, would need distinct userId count.
            const regCount = await db.select({ count: sql`count(*)` })
                .from(registrations)
                .where(sql`${registrations.status} != 'CANCELLED' AND ${registrations.tournamentId} IN ${tournamentIds}`);
            totalPlayers = regCount[0].count;
        }

        res.json({
            success: true,
            data: {
                tournaments: myTournaments,
                stats: {
                    activeTournaments,
                    totalPlayers,
                    prizePool: totalPrizePool,
                    successRate: "100%" // Placeholder logic
                }
            }
        });
    } catch (error) {
        console.error('Host tournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch host data' });
    }
};

// Secure: Get Participants (Host/Admin Only)
// Enforces Data Isolation: Only the creator of the tournament can view participants (or SuperAdmin)
const getParticipants = async (req, res) => {
    try {
        const tournamentId = req.params.id;

        // 1. Verify Tournament Ownership
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
        if (!tournament[0]) return res.status(404).json({ success: false, message: 'Tournament not found' });

        // STRICT ISOLATION CHECK
        if (tournament[0].hostId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, message: 'ACCESS DENIED: You do not have permission to view this data.' });
        }

        // 2. Fetch Participants with Profiles
        const parts = await db.select({
            id: registrations.id,
            userId: registrations.userId,
            status: registrations.status,
            createdAt: registrations.createdAt,
            user: {
                username: users.username,
                email: users.email
            },
            playerProfile: {
                avatarUrl: playerProfiles.avatarUrl,
                ign: playerProfiles.ign
            }
        })
            .from(registrations)
            .leftJoin(users, eq(registrations.userId, users.id))
            .leftJoin(playerProfiles, eq(registrations.userId, playerProfiles.userId))
            .where(eq(registrations.tournamentId, tournamentId));

        res.json({ success: true, data: parts });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch participants' });
    }
};

// Secure: Update Participant Status (Host/Admin Only)
const updateParticipantStatus = async (req, res) => {
    try {
        const { id: tournamentId, participantId } = req.params;
        const { status } = req.body; // 'CONFIRMED' | 'REJECTED'

        // 1. Verify Ownership
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
        if (!tournament[0]) return res.status(404).json({ success: false, message: 'Tournament not found' });

        // STRICT ISOLATION CHECK
        if (tournament[0].hostId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, message: 'ACCESS DENIED: You do not have permission to manage this tournament.' });
        }

        // 2. Update Status
        await db.update(registrations)
            .set({ status })
            .where(eq(registrations.id, participantId));

        res.json({ success: true, message: `Participant ${status.toLowerCase()}` });
    } catch (error) {
        console.error('Update participant error:', error);
        res.status(500).json({ success: false, message: 'Failed to update participant' });
    }
};

// Stub Update/Delete for now
const updateTournament = async (req, res) => res.status(501).json({ message: 'Not implemented' });
const deleteTournament = async (req, res) => res.status(501).json({ message: 'Not implemented' });
const joinTournament = async (req, res) => res.status(501).json({ message: 'Not implemented' });
const leaveTournament = async (req, res) => res.status(501).json({ message: 'Not implemented' });
const declareWinners = async (req, res) => res.status(501).json({ message: 'Not implemented' });
const getWinners = async (req, res) => res.status(501).json({ message: 'Not implemented' });


module.exports = {
    createTournament,
    getAllTournaments,
    getTournamentById,
    updateTournament,
    deleteTournament,
    joinTournament,
    leaveTournament,
    getParticipants,
    updateParticipantStatus,
    declareWinners,
    getWinners,
    getTournamentsByHost
};
