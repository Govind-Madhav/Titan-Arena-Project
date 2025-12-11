/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const teamController = require('./team.controller');
const { authRequired } = require('../middlewares/auth.middleware');
const { requireNotBanned } = require('../middlewares/role.middleware');

router.use(authRequired, requireNotBanned);

// CRUD
router.post('/', teamController.createTeam);
router.get('/my', teamController.getMyTeams);
router.get('/:id', teamController.getTeam);
router.patch('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

// Member management
router.post('/:id/members', teamController.addMember);
router.delete('/:id/members/:userId', teamController.removeMember);

module.exports = router;
