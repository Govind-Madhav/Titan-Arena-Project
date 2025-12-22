/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../db');
const { users, tournaments, registrations, matches } = require('../db/schema');
const { eq, desc, count } = require('drizzle-orm');

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const result = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            isBanned: users.isBanned,
            createdAt: users.createdAt
        }).from(users).orderBy(desc(users.createdAt));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Get all tournaments
const getAllTournaments = async (req, res) => {
    try {
        const result = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            status: tournaments.status,
            hostId: tournaments.hostId,
            entryFee: tournaments.entryFee,
            prizePool: tournaments.prizePool,
            createdAt: tournaments.createdAt,
            game: tournaments.game,
            active: tournaments.status, // Mapping for frontend which might expect 'active' boolean or status string
            startDate: tournaments.startTime,
            joiningFee: tournaments.entryFee,
            gameType: tournaments.type
        })
            .from(tournaments)
            .orderBy(desc(tournaments.createdAt));

        const mapped = result.map(t => ({
            ...t,
            active: t.status === 'ONGOING' || t.status === 'UPCOMING' || t.status === 'REGISTRATION' // Simple mapping
        }));

        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Admin get tournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
};

// Delete tournament
const deleteTournament = async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete(tournaments).where(eq(tournaments.id, id));
        res.json({ success: true, message: 'Tournament deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete tournament' });
    }
};

// Toggle status
const toggleTournamentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.query; // string "true"/"false"

        const newStatus = isActive === 'true' ? 'ONGOING' : 'CANCELLED';

        await db.update(tournaments)
            .set({ status: newStatus })
            .where(eq(tournaments.id, id));

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

// Get stats
const getStats = async (req, res) => {
    try {
        // Simple counts
        const userCount = await db.select({ count: count() }).from(users).then(r => r[0].count);
        const tournCount = await db.select({ count: count() }).from(tournaments).then(r => r[0].count);

        res.json({ success: true, data: { users: userCount, tournaments: tournCount } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

module.exports = {
    getAllUsers,
    getUserById: (req, res) => res.status(501).json({}), // Low prio
    updateUser: (req, res) => res.status(501).json({}),
    deleteUser: async (req, res) => {
        try {
            await db.delete(users).where(eq(users.id, req.params.id));
            res.json({ success: true });
        } catch (e) { res.status(500).json({ success: false }); }
    },
    updateUserRole: (req, res) => res.status(501).json({}),
    getAllTournaments,
    deleteTournament,
    getStats,
    toggleTournamentStatus
};
