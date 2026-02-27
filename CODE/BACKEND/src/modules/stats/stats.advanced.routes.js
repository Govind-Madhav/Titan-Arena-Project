/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * Stats Routes v2 — Phase D additions
 * Adds AI win prediction and per-player MMR endpoints.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const mmrService = require('../../services/mmr.service');
const achievementService = require('../../services/achievement.service');
const { db } = require('../../db');
const { matches, tournaments, teamMmrRatings } = require('../../db/schema');
const { eq, and } = require('drizzle-orm');

// ─── MMR / Leaderboard ────────────────────────────────────────────────────────

/**
 * GET /api/stats/mmr/:userId
 * Returns the MMR profile for a user.
 */
router.get('/mmr/:userId', async (req, res) => {
    try {
        const rating = await mmrService.getRating(req.params.userId);
        if (!rating) return res.status(404).json({ success: false, message: 'No MMR data found for this user' });
        res.json({ success: true, data: rating });
    } catch (err) {
        console.error('MMR fetch error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch MMR' });
    }
});

// ─── AI Match Prediction ──────────────────────────────────────────────────────

/**
 * GET /api/stats/matches/:matchId/predict
 * Returns AI-powered win probability based on Elo ratings.
 */
router.get('/matches/:matchId/predict', async (req, res) => {
    try {
        const rows = await db
            .select({ match: matches, tournament: tournaments })
            .from(matches)
            .innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
            .where(eq(matches.id, req.params.matchId));

        if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found' });

        const { match, tournament } = rows[0];

        if (!match.participantAId || !match.participantBId) {
            return res.status(400).json({ success: false, message: 'Match participants not yet determined' });
        }

        let prediction;

        if (tournament.type === 'TEAM') {
            // ─── GAP J FIX: Use team-level Elo for team matches ───────────────────────
            const DEFAULT_RATING = 1200;
            const [teamARow] = await db
                .select({ rating: teamMmrRatings.rating })
                .from(teamMmrRatings)
                .where(eq(teamMmrRatings.teamId, match.participantAId));
            const [teamBRow] = await db
                .select({ rating: teamMmrRatings.rating })
                .from(teamMmrRatings)
                .where(eq(teamMmrRatings.teamId, match.participantBId));

            const ratingA = teamARow?.rating ?? DEFAULT_RATING;
            const ratingB = teamBRow?.rating ?? DEFAULT_RATING;
            const probA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

            prediction = {
                participantA: { id: match.participantAId, winProbability: Math.round(probA * 1000) / 10 },
                participantB: { id: match.participantBId, winProbability: Math.round((1 - probA) * 1000) / 10 },
            };
        } else {
            prediction = await mmrService.predictWinProbability(match.participantAId, match.participantBId);
        }

        res.json({
            success: true,
            data: {
                matchId: match.id,
                tournamentType: tournament.type,
                status: match.status,
                prediction,
                note: 'Probabilities are based on Elo ratings and are for entertainment purposes.',
            },
        });
    } catch (err) {
        console.error('Prediction error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate prediction' });
    }
});

// ─── Achievements ─────────────────────────────────────────────────────────────

/**
 * GET /api/stats/achievements/:userId
 * Returns all achievements earned by a user.
 */
router.get('/achievements/:userId', async (req, res) => {
    try {
        const data = await achievementService.getUserAchievements(req.params.userId);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Achievement fetch error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch achievements' });
    }
});

// ─── OBS Bracket Overlay ──────────────────────────────────────────────────────

/**
 * GET /api/stats/overlay/:tournamentId
 * Public endpoint — returns bracket data formatted for OBS browser source.
 * The frontend renders this at /overlay/:tournamentId as a transparent widget.
 */
router.get('/overlay/:tournamentId', async (req, res) => {
    try {
        const tournamentRows = await db.select().from(tournaments)
            .where(eq(tournaments.id, req.params.tournamentId));

        if (!tournamentRows.length) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const matchRows = await db.select().from(matches)
            .where(eq(matches.tournamentId, req.params.tournamentId));

        const tournament = tournamentRows[0];

        // Group matches by round for easy rendering
        const rounds = {};
        for (const m of matchRows) {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push({
                id: m.id,
                matchNumber: m.matchNumber,
                participantAId: m.participantAId,
                participantBId: m.participantBId,
                scoreA: m.scoreA,
                scoreB: m.scoreB,
                winnerId: m.winnerId,
                status: m.status,
                isBye: m.isBye,
            });
        }

        res.json({
            success: true,
            data: {
                tournament: {
                    id: tournament.id,
                    name: tournament.name,
                    game: tournament.game,
                    status: tournament.status,
                    currentRound: tournament.currentRound,
                    totalRounds: tournament.totalRounds,
                    winnerId: tournament.winnerId,
                },
                rounds,
                updatedAt: new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error('Overlay error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate overlay data' });
    }
});

module.exports = router;
