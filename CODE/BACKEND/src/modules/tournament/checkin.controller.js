/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * Check-in System
 * Players must check in within the check-in window before the tournament starts.
 * Only checked-in participants are included in bracket generation.
 */

const { db } = require('../../db');
const { checkins, tournaments, registrations, teamMembers } = require('../../db/schema');
const { eq, and, or, inArray } = require('drizzle-orm');

/**
 * POST /api/tournaments/:id/checkin
 * Player or team checks in for the tournament.
 */
exports.checkIn = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user.id;

        const tournamentRows = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
        if (!tournamentRows.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
        const tournament = tournamentRows[0];

        // Validate check-in window
        const now = new Date();
        if (tournament.checkinStart && now < new Date(tournament.checkinStart)) {
            return res.status(400).json({ success: false, message: 'Check-in window has not opened yet' });
        }
        if (tournament.checkinEnd && now > new Date(tournament.checkinEnd)) {
            return res.status(400).json({ success: false, message: 'Check-in window has closed' });
        }
        if (!['UPCOMING', 'REGISTRATION_CLOSED'].includes(tournament.status)) {
            return res.status(400).json({ success: false, message: 'Tournament is not in check-in phase' });
        }

        let teamId = null;
        let regRows = await db.select().from(registrations)
            .where(and(
                eq(registrations.tournamentId, tournamentId),
                eq(registrations.userId, userId),
                eq(registrations.status, 'APPROVED')
            ));

        if (!regRows.length && tournament.type === 'TEAM') {
            // Resolve user's team(s) for this tournament
            const teamMemberships = await db
                .select({ teamId: teamMembers.teamId })
                .from(teamMembers)
                .where(eq(teamMembers.userId, userId));

            const teamIds = teamMemberships.map(m => m.teamId);
            if (teamIds.length) {
                // Find an approved team registration for this tournament
                regRows = await db.select().from(registrations)
                    .where(and(
                        eq(registrations.tournamentId, tournamentId),
                        eq(registrations.status, 'APPROVED'),
                        inArray(registrations.teamId, teamIds)
                    ));
                if (regRows.length) {
                    teamId = regRows[0].teamId;
                }
            }
        }

        if (!regRows.length) {
            return res.status(403).json({ success: false, message: 'You do not have an approved registration for this tournament' });
        }

        // Prevent duplicate check-ins
        const existing = await db.select().from(checkins)
            .where(and(eq(checkins.tournamentId, tournamentId), eq(checkins.userId, userId)));

        if (existing.length) {
            return res.json({ success: true, message: 'Already checked in', data: existing[0] });
        }

        const [newCheckin] = await db.insert(checkins)
            .values({ tournamentId, userId, teamId })    // store teamId when applicable
            .returning();

        res.status(201).json({ success: true, message: 'Checked in successfully!', data: newCheckin });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, message: 'Failed to check in' });
    }
};

/**
 * GET /api/tournaments/:id/checkins
 * Host/Admin sees all check-ins for a tournament.
 */
exports.getCheckins = async (req, res) => {
    try {
        const tournamentId = req.params.id;

        const tournamentRows = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
        if (!tournamentRows.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
        const tournament = tournamentRows[0];

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const rows = await db.select().from(checkins).where(eq(checkins.tournamentId, tournamentId));
        res.json({ success: true, data: rows, count: rows.length });
    } catch (error) {
        console.error('Get checkins error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch check-ins' });
    }
};

/**
 * DELETE /api/tournaments/:id/checkin
 * Player withdraws their check-in (e.g. can't play anymore).
 */
exports.withdrawCheckin = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user.id;

        await db.delete(checkins)
            .where(and(eq(checkins.tournamentId, tournamentId), eq(checkins.userId, userId)));

        res.json({ success: true, message: 'Check-in withdrawn' });
    } catch (error) {
        console.error('Withdraw checkin error:', error);
        res.status(500).json({ success: false, message: 'Failed to withdraw check-in' });
    }
};

/**
 * Helper: Get checked-in participant IDs for a tournament.
 * Called by tournament.controller.js during tournament start.
 */
exports.getCheckedInParticipantIds = async (tournamentId) => {
    const rows = await db.select({ userId: checkins.userId, teamId: checkins.teamId })
        .from(checkins)
        .where(eq(checkins.tournamentId, tournamentId));
    return rows;
};
