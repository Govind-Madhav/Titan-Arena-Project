/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/role', adminController.updateUserRole);

// Tournament management
router.get('/tournaments', adminController.getAllTournaments);
router.delete('/tournaments/:id', adminController.deleteTournament);

// Statistics/Dashboard
router.get('/stats', adminController.getStats);

module.exports = router;
