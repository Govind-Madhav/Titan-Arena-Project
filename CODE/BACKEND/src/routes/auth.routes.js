/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const authController = require('../modules/auth/auth.controller');
const { authRequired } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/security.middleware');

// Public routes
router.post('/register', authLimiter, authController.signup); // Alias
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authRequired, authController.logout);

// Email verification routes
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Protected routes
router.get('/me', authRequired, authController.getMe);
router.post('/logout-all', authRequired, authController.logoutAllDevices);
router.get('/dashboard', authRequired, authController.getDashboard);
router.get('/notifications', authRequired, authController.getNotifications);
router.put('/profile', authRequired, authController.updateProfile);

module.exports = router;
