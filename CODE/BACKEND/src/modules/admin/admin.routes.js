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

// Host Applications
router.get('/host-applications', adminController.getHostApplications);
router.post('/host-applications/:id/review', adminController.reviewHostApplication);

// Wallet Management
router.get('/wallets', adminController.getWallets);
router.post('/wallets/adjust', adminController.adjustWallet);

module.exports = router;
