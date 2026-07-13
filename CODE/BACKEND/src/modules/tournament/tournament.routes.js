/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const tournamentController = require('./tournament.controller');
const checkinController = require('./checkin.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { requireNotBanned, requireVerifiedHost } = require('../../middleware/role.middleware');
const { globalLimiter } = require('../../middleware/security.middleware');
const { uploadCommunityImage } = require('../../middleware/upload.middleware');

// Public routes
router.get('/', tournamentController.getAllTournaments);

// Host Dashboard - Must be before :id to avoid conflict
router.get('/host/dashboard', authenticate, authorize('HOST', 'ADMIN', 'SUPERADMIN'), tournamentController.getTournamentsByHost);

router.get('/:id', tournamentController.getTournamentById);

// Host routes
router.post('/', authenticate, requireNotBanned, requireVerifiedHost, tournamentController.createTournament);
router.post('/:id/upload-banner', authenticate, requireNotBanned, requireVerifiedHost, uploadCommunityImage, tournamentController.uploadBanner);
router.patch('/:id/stream', authenticate, requireNotBanned, requireVerifiedHost, tournamentController.updateTournamentStream);
router.put('/:id', authenticate, requireNotBanned, requireVerifiedHost, tournamentController.updateTournament);
router.delete('/:id', authenticate, requireNotBanned, requireVerifiedHost, tournamentController.deleteTournament);
router.get('/:id/participants', authenticate, tournamentController.getParticipants);
router.put('/:id/participants/:participantId/status', authenticate, requireNotBanned, requireVerifiedHost, tournamentController.updateParticipantStatus);

// Tournament Cancellation (with auto-refund)
router.post('/:id/cancel', authenticate, requireNotBanned, requireVerifiedHost, globalLimiter, tournamentController.cancelTournament);

// Check-in System
router.post('/:id/checkin', authenticate, authorize('PLAYER', 'HOST'), checkinController.checkIn);
router.delete('/:id/checkin', authenticate, authorize('PLAYER', 'HOST'), checkinController.withdrawCheckin);
router.get('/:id/checkins', authenticate, requireNotBanned, requireVerifiedHost, checkinController.getCheckins);

// Player routes
router.post('/:id/join', authenticate, authorize('PLAYER', 'HOST'), tournamentController.joinTournament);
router.delete('/:id/leave', authenticate, authorize('PLAYER', 'HOST'), tournamentController.leaveTournament);

// Host - Declare winners (Legacy/Manual)
router.post('/:id/winners', authenticate, requireNotBanned, requireVerifiedHost, tournamentController.declareWinners);
router.get('/:id/winners', tournamentController.getWinners);

// Get tournaments by host (Legacy route)
router.get('/host/:hostId', authenticate, tournamentController.getTournamentsByHost);

module.exports = router;

