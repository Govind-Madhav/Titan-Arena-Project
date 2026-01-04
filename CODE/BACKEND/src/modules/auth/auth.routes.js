/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authRequired } = require('../../middleware/auth.middleware');

const { authLimiter } = require('../../middleware/security.middleware');
const { forgotPasswordLimiter, resetPasswordLimiter } = require('../../middleware/rateLimit.middleware');

// Public routes
router.post('/register', authLimiter, authController.signup); // Alias for compatibility
router.post('/signup', authLimiter, authController.signup);
router.post('/check-availability', authLimiter, authController.checkAvailability); // Real-time validation route
router.post('/check-ign', authLimiter, authController.checkIgnAvailability); // IGN availability check
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authRequired, authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

// Email verification routes
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/trigger-verification', authLimiter, authController.triggerVerificationEmail);

const { firebaseAuth } = require('../../middleware/auth.middleware');

// ... (existing routes)

// ⚡ HYBRID IDENTITY ENDPOINTS
router.post('/sync', firebaseAuth, authController.sync);
router.get('/me', firebaseAuth, authController.getMe);
router.get('/dashboard', firebaseAuth, authController.getDashboard);
router.post('/logout-all', firebaseAuth, authController.logoutAllDevices);

module.exports = router;

