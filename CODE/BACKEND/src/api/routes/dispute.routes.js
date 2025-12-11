/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const disputeController = require('./dispute.controller');
const { authRequired } = require('../middlewares/auth.middleware');
const { requireNotBanned, requireAdmin } = require('../middlewares/role.middleware');

// Player routes
router.post('/match/:matchId', authRequired, requireNotBanned, disputeController.createDispute);
router.get('/my', authRequired, disputeController.getMyDisputes);

// Admin routes
router.get('/', authRequired, requireAdmin(), disputeController.listDisputes);
router.patch('/:id/resolve', authRequired, requireAdmin(), disputeController.resolveDispute);

module.exports = router;
