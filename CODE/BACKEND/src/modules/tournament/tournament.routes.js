/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const tournamentController = require('./tournament.controller');
const { authRequired, authOptional } = require('../../middleware/auth.middleware');
const { requireNotBanned, requireVerifiedHost, requireAdmin } = require('../../middleware/role.middleware');

// Public routes
router.get('/', authOptional, tournamentController.listTournaments);
router.get('/:id', authOptional, tournamentController.getTournament);

// Host routes (create/manage)
router.post('/', authRequired, requireNotBanned, requireVerifiedHost, tournamentController.createTournament);
router.patch('/:id', authRequired, requireNotBanned, tournamentController.updateTournament);
router.patch('/:id/cancel', authRequired, requireNotBanned, tournamentController.cancelTournament);
router.patch('/:id/postpone', authRequired, requireNotBanned, tournamentController.postponeTournament);

// Registration (player routes)
router.post('/:id/register', authRequired, requireNotBanned, tournamentController.register);
router.post('/:id/unregister', authRequired, requireNotBanned, tournamentController.unregister);
router.get('/:id/participants', tournamentController.getParticipants);

// Tournament lifecycle (host/admin)
router.post('/:id/close-registration', authRequired, requireNotBanned, tournamentController.closeRegistration);
router.post('/:id/generate-bracket', authRequired, requireNotBanned, tournamentController.generateBracket);
router.post('/:id/complete', authRequired, requireNotBanned, tournamentController.completeTournament);

module.exports = router;
