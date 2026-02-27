/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * Stats & Leaderboard Routes
 *
 * Phase 3 (CQRS):
 *   GET /api/stats/leaderboard                    → global top N (Redis-first)
 *   GET /api/stats/leaderboard/game/:game         → per-game top N
 *   GET /api/stats/leaderboard/tournament/:id     → per-tournament rankings
 *   GET /api/stats/leaderboard/player/:userId     → player rank + score
 */

const express = require('express');
const router = express.Router();
const statsController = require('./stats.controller');
const leaderboardService = require('./leaderboard.service');
const { authRequired } = require('../../middleware/auth.middleware');

// ─── Existing routes ──────────────────────────────────────────────────────────

// Get My Stats (Auth required)
router.get('/my', authRequired, statsController.getMyStats);

// ─── Phase 3: CQRS Leaderboard routes ─────────────────────────────────────────

/**
 * GET /api/stats/leaderboard?limit=50
 * Global all-time leaderboard. Redis ZREVRANGE → PostgreSQL fallback.
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const data = await leaderboardService.getGlobalLeaderboard(limit);
        res.json({ success: true, source: 'redis', data });
    } catch (err) {
        console.error('❌ GET /leaderboard error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
});

/**
 * GET /api/stats/leaderboard/game/:game?limit=50
 * Per-game leaderboard (e.g., /leaderboard/game/bgmi).
 */
router.get('/leaderboard/game/:game', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const data = await leaderboardService.getGameLeaderboard(req.params.game, limit);
        res.json({ success: true, game: req.params.game, data });
    } catch (err) {
        console.error('❌ GET /leaderboard/game error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch game leaderboard' });
    }
});

/**
 * GET /api/stats/leaderboard/tournament/:tournamentId
 * Per-tournament rankings. Redis-first → PostgreSQL fallback.
 */
router.get('/leaderboard/tournament/:tournamentId', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const data = await leaderboardService.getTournamentLeaderboard(req.params.tournamentId, limit);
        res.json({ success: true, tournamentId: req.params.tournamentId, data });
    } catch (err) {
        console.error('❌ GET /leaderboard/tournament error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch tournament leaderboard' });
    }
});

/**
 * GET /api/stats/leaderboard/player/:userId
 * A single player's global rank and score.
 */
router.get('/leaderboard/player/:userId', async (req, res) => {
    try {
        const data = await leaderboardService.getPlayerRank(req.params.userId);
        if (!data) {
            return res.json({ success: true, data: null, message: 'Player not yet on leaderboard' });
        }
        res.json({ success: true, data });
    } catch (err) {
        console.error('❌ GET /leaderboard/player error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch player rank' });
    }
});

module.exports = router;
