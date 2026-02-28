/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const matchController = require('./match.controller');
const { authRequired, authOptional } = require('../../middleware/auth.middleware');
const { requireNotBanned, requireAdmin } = require('../../middleware/role.middleware');

// ─── Stream routes (must come before /:id to avoid route collision) ────────────
router.get('/streams/live', matchController.getLiveStreams);
router.get('/:id/stream', matchController.getMatchStream);
router.patch('/:id/stream', authRequired, requireNotBanned, matchController.updateStream);

// Get matches for tournament
router.get('/tournament/:tournamentId', authOptional, matchController.getMatches);

// Get current user's matches (dashboard / live score page)
router.get('/my', authRequired, matchController.getMyMatches);

// Get single match
router.get('/:id', authOptional, matchController.getMatch);


// Generate bracket (host/admin)
router.post('/tournament/:tournamentId/generate', authRequired, requireNotBanned, matchController.generateBracket);

// Submit result (host/admin)
router.patch('/:id/result', authRequired, requireNotBanned, matchController.submitResult);

// Upload proof
router.patch('/:id/proof', authRequired, requireNotBanned, matchController.uploadProof);

// Complete tournament and trigger payouts
router.post('/tournament/:tournamentId/complete', authRequired, requireNotBanned, matchController.completeTournament);

module.exports = router;

