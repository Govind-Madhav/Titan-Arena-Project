/**
 * Admin Routes — /api/admin/*
 * All routes protected by auth + requireAdmin middleware
 */

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authRequired, isAdmin } = require('../../middleware/auth.middleware');

// All admin routes: must be authenticated + admin
router.use(authRequired, isAdmin);

// Stats
router.get('/stats', adminController.getStats);

// User Management
router.get('/users', adminController.getUsers);
router.post('/users/:id/ban', adminController.banUser);
router.patch('/users/:id/role', adminController.updateUserRole);

// Tournament Management
router.get('/tournaments', adminController.getTournaments);
router.post('/tournaments/:id/cancel', adminController.cancelTournament);
router.put('/toggle-tournament-status/:id', adminController.toggleTournamentStatus);
router.delete('/tournaments/:id', adminController.deleteTournamentByAdmin);

// Host Applications
router.get('/host-applications', adminController.getHostApplications);
router.post('/host-applications/:id/review', adminController.reviewHostApplication);
router.get('/applications', adminController.getApplications);
router.post('/applications/:id/approve', adminController.approveApplication);
router.post('/applications/:id/reject', adminController.rejectApplication);
router.get('/pending-hosts', adminController.getPendingHosts);
router.get('/verified-hosts', adminController.getVerifiedHosts);
router.put('/approve-host/:id', adminController.approveHost);
router.delete('/delete-host/:id', adminController.deleteHost);
router.post('/reassign-workload', adminController.reassignWorkload);

// Wallet Management
router.get('/wallets', adminController.getWallets);
router.post('/wallets/adjust', adminController.adjustWallet);

module.exports = router;
