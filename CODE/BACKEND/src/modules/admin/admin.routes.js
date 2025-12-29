/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authRequired: authenticate, authorize } = require('../../middleware/auth.middleware');

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// User management
router.get('/users', adminController.getAllUsers);
router.get('/admins', adminController.getAdmins); // New endpoint
router.get('/pending-players', adminController.getPendingPlayers);
router.get('/verified-players', adminController.getVerifiedPlayers);
router.put('/approve-player/:id', adminController.approvePlayer);
router.delete('/delete-player/:id', adminController.deletePlayer);

router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
// router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/role', adminController.updateUserRole);

// Tournament management
router.get('/tournaments', adminController.getAllTournaments);
router.delete('/tournaments/:id', adminController.deleteTournament);
router.put('/toggle-tournament-status/:id', adminController.toggleTournamentStatus);

// Statistics/Dashboard
router.get('/stats', adminController.getStats);

// Super Admin Operations
router.post('/reassign-workload', authorize('SUPERADMIN'), adminController.reassignWorkload);

// Host Application Management (Phase 3)
router.get('/applications', adminController.getPendingHostApplications);
router.post('/applications/:applicationId/approve', adminController.approveHostApplication);
router.post('/applications/:applicationId/reject', adminController.rejectHostApplication);

module.exports = router;
