/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const statsController = require('./stats.controller');
const { authRequired } = require('../../middleware/auth.middleware');

// Get My Stats (Auth required)
router.get('/my', authRequired, statsController.getMyStats);

// Get Global Leaderboard (Public)
router.get('/leaderboard', statsController.getLeaderboard);

module.exports = router;
