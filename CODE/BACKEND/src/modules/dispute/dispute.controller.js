/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { disputes, matches, users, tournaments, auditLogs, teamMembers } = require('../../db/schema');
const { eq, and, desc, count, or } = require('drizzle-orm');
const { z } = require('zod');
const { publishEvent } = require('../../config/kafka.config');
const mmrService = require('../../services/mmr.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if userId is a direct participant in the match
 * or a member of a participating team (TEAM tournaments).
 */
const isMatchParticipant = async (userId, match, tournamentType) => {
    if (tournamentType !== 'TEAM') {
        return userId === match.participantAId || userId === match.participantBId;
    }
    // Team mode — check team membership
    const teamIds = [match.participantAId, match.participantBId].filter(Boolean);
    if (!teamIds.length) return false;
    const rows = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(and(
            or(...teamIds.map(tid => eq(teamMembers.teamId, tid))),
            eq(teamMembers.userId, userId)
        ));
    return rows.length > 0;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// Create dispute
exports.createDispute = async (req, res) => {
    try {
        const schema = z.object({
            reason: z.string().min(10, 'Reason must be at least 10 characters'),
            evidenceUrl: z.string().url().optional()
        });

        const data = schema.parse(req.body);

        const matchResult = await db
            .select({ match: matches, tournament: tournaments })
            .from(matches)
            .innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
            .where(eq(matches.id, req.params.matchId))
            .limit(1);

        if (!matchResult.length) {
            return res.status(404).json({ success: false, message: 'Match not found' });
        }
        const { match, tournament } = matchResult[0];

        // ─── GAP H FIX: Only actual participants can file a dispute ───────────
        const participant = await isMatchParticipant(req.user.id, match, tournament.type);
        if (!participant) {
            return res.status(403).json({ success: false, message: 'Only match participants can raise a dispute' });
        }

        if (match.status === 'DISPUTED') {
            return res.status(400).json({ success: false, message: 'Match already has an open dispute' });
        }

        await db.transaction(async (tx) => {
            await tx.insert(disputes).values({
                matchId: match.id,
                raisedById: req.user.id,
                reason: data.reason,
                evidenceUrl: data.evidenceUrl || null,
                status: 'OPEN'
            });

            await tx.update(matches)
                .set({ status: 'DISPUTED' })
                .where(eq(matches.id, match.id));
        });

        res.status(201).json({ success: true, message: 'Dispute raised successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        console.error('Create dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to create dispute' });
    }
};

// Get my disputes — GAP K FIX: removed duplicate query
exports.getMyDisputes = async (req, res) => {
    try {
        const rows = await db.select()
            .from(disputes)
            .leftJoin(matches, eq(disputes.matchId, matches.id))
            .where(eq(disputes.raisedById, req.user.id))
            .orderBy(desc(disputes.createdAt));

        const data = rows.map(row => ({
            ...row.dispute,
            match: row.match
        }));

        res.json({ success: true, data });
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
        const take = parseInt(limit);

        const conditions = [];
        if (status) conditions.push(eq(disputes.status, status));

        const [results, totalResult] = await Promise.all([
            db.select({
                dispute: disputes,
                match: matches,
                tournament: { id: tournaments.id, name: tournaments.name },
                raisedBy: { id: users.id, username: users.username }
            })
                .from(disputes)
                .leftJoin(matches, eq(disputes.matchId, matches.id))
                .leftJoin(tournaments, eq(matches.tournamentId, tournaments.id))
                .leftJoin(users, eq(disputes.raisedById, users.id))
                .where(and(...conditions))
                .orderBy(desc(disputes.createdAt))
                .limit(take)
                .offset(skip),

            db.select({ count: count() }).from(disputes).where(and(...conditions))
        ]);

        const data = results.map(row => ({
            ...row.dispute,
            match: { ...row.match, tournament: row.tournament },
            raisedBy: row.raisedBy
        }));

        const total = totalResult[0]?.count || 0;

        res.json({
            success: true,
            data,
            pagination: { page: parseInt(page), limit: take, total }
        });
    } catch (error) {
        console.error('List disputes error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
    }
};

// Admin: Resolve dispute — GAP I FIX: overrideWinnerId now re-triggers MMR + bracket slot
exports.resolveDispute = async (req, res) => {
    try {
        const { resolution, overrideWinnerId } = req.body;

        if (!resolution) {
            return res.status(400).json({ success: false, message: 'Resolution is required' });
        }

        // Fetch dispute with match and tournament
        const rows = await db.select({
            dispute: disputes,
            match: matches,
            tournament: tournaments
        })
            .from(disputes)
            .innerJoin(matches, eq(disputes.matchId, matches.id))
            .innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
            .where(eq(disputes.id, req.params.id))
            .limit(1);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Dispute not found' });
        }
        const { dispute, match, tournament } = rows[0];

        const previousWinnerId = match.winnerId;
        const winnerChanged = overrideWinnerId && overrideWinnerId !== previousWinnerId;

        await db.transaction(async (tx) => {
            // Update dispute
            await tx.update(disputes)
                .set({ status: 'RESOLVED', resolution, resolvedAt: new Date() })
                .where(eq(disputes.id, dispute.id));

            // Update match
            const matchUpdate = { status: 'COMPLETED' };
            if (overrideWinnerId) matchUpdate.winnerId = overrideWinnerId;

            await tx.update(matches)
                .set(matchUpdate)
                .where(eq(matches.id, dispute.matchId));

            // ─── GAP I FIX: Re-seed next-round bracket slot when winner changes ─
            if (winnerChanged) {
                const nextRound = match.round + 1;
                const nextMatchNumber = Math.ceil(match.matchNumber / 2);
                const nextMatchRows = await tx
                    .select()
                    .from(matches)
                    .where(and(
                        eq(matches.tournamentId, match.tournamentId),
                        eq(matches.round, nextRound),
                        eq(matches.matchNumber, nextMatchNumber)
                    ))
                    .limit(1);

                if (nextMatchRows.length) {
                    const nextMatch = nextMatchRows[0];
                    const isFirstOfPair = match.matchNumber % 2 === 1;
                    const slotField = isFirstOfPair ? 'participantAId' : 'participantBId';
                    await tx.update(matches)
                        .set({ [slotField]: overrideWinnerId })
                        .where(eq(matches.id, nextMatch.id));
                }
            }

            // Audit log
            await tx.insert(auditLogs).values({
                adminId: req.user.id,
                userId: req.user.id,
                action: overrideWinnerId ? 'MATCH_RESULT_OVERRIDE' : 'DISPUTE_RESOLVED',
                targetId: dispute.id,
                details: JSON.stringify({ matchId: dispute.matchId, resolution, overrideWinnerId })
            });
        });

        // ─── GAP I FIX: Re-run MMR with corrected winner/loser (non-blocking) ─
        if (winnerChanged) {
            const isTeam = tournament.type === 'TEAM';
            const correctLoserId = match.participantAId === overrideWinnerId
                ? match.participantBId
                : match.participantAId;

            if (isTeam) {
                mmrService.processTeamMatchResult(overrideWinnerId, correctLoserId, match.id, match.tournamentId, null)
                    .catch(err => console.error('Dispute MMR recalc (team) failed:', err.message));
            } else {
                mmrService.processMatchResult(overrideWinnerId, correctLoserId)
                    .catch(err => console.error('Dispute MMR recalc (solo) failed:', err.message));
            }
        }

        // 🔔 KAFKA: Publish dispute.resolved event
        await publishEvent('dispute.resolved', {
            eventType: 'DISPUTE_RESOLVED',
            disputeId: dispute.id,
            matchId: dispute.matchId,
            tournamentId: match.tournamentId,
            resolution,
            overrideWinnerId: overrideWinnerId || null,
            winnerChanged,
            resolvedBy: req.user.id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, message: 'Dispute resolved' });
    } catch (error) {
        console.error('Resolve dispute error:', error);
        res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
    }
};
