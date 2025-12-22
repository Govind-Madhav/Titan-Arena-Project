/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const tournamentController = require('../modules/tournament/tournament.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { actionLimiter } = require('../middleware/security.middleware');

// Public routes
router.get('/', tournamentController.getAllTournaments);
router.get('/:id', tournamentController.getTournamentById);

// Host routes
router.post('/', authenticate, authorize('HOST', 'ADMIN'), tournamentController.createTournament);
router.put('/:id', authenticate, authorize('HOST', 'ADMIN'), tournamentController.updateTournament);
router.delete('/:id', authenticate, authorize('HOST', 'ADMIN'), tournamentController.deleteTournament);
router.get('/:id/participants', authenticate, tournamentController.getParticipants);
router.put('/:id/participants/:participantId/status', authenticate, authorize('HOST', 'ADMIN'), tournamentController.updateParticipantStatus);

// Tournament Lifecycle (Enterprise)
router.post('/:id/start', authenticate, authorize('HOST', 'ADMIN'), actionLimiter, tournamentController.startTournament);
router.post('/:id/finalize', authenticate, authorize('HOST', 'ADMIN'), actionLimiter, tournamentController.finalizeTournament);

// Player routes
router.post('/:id/join', authenticate, authorize('PLAYER'), tournamentController.joinTournament);
router.delete('/:id/leave', authenticate, authorize('PLAYER'), tournamentController.leaveTournament);

// Host - Declare winners (Legacy/Manual)
router.post('/:id/winners', authenticate, authorize('HOST', 'ADMIN'), tournamentController.declareWinners);
router.get('/:id/winners', tournamentController.getWinners);

// Get tournaments by host
router.get('/host/:hostId', authenticate, tournamentController.getTournamentsByHost);

module.exports = router;
