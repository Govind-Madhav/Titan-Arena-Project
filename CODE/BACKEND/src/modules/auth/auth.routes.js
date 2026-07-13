/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authRequired, firebaseAuth } = require('../../middleware/auth.middleware');

const { authLimiter, availabilityCheckLimiter } = require('../../middleware/security.middleware');
const { forgotPasswordLimiter, resetPasswordLimiter } = require('../../middleware/rateLimit.middleware');

// Public routes
router.post('/register', authLimiter, authController.signup); // Alias for compatibility
router.post('/signup', authLimiter, authController.signup);
router.get('/detect-location', authController.detectLocation);
router.post('/check-availability', availabilityCheckLimiter, authController.checkAvailability); // Real-time validation route
router.post('/check-ign', availabilityCheckLimiter, authController.checkIgnAvailability); // IGN availability check
router.post('/login', authLimiter, authController.login);
router.post('/lookup-email', availabilityCheckLimiter, authController.lookupEmail); // Username login support
router.post('/refresh', authController.refresh);
router.post('/logout', authRequired, authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/trigger-password-reset', forgotPasswordLimiter, authController.triggerPasswordReset); // Custom Branded Flow
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

// Email verification routes
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/trigger-verification', authLimiter, authController.triggerVerificationEmail);

// ... (existing routes)

// ⚡ HYBRID IDENTITY ENDPOINTS
router.post('/sync', firebaseAuth, authController.sync);
router.get('/me', authRequired, authController.getMe);
router.get('/dashboard', authRequired, authController.getDashboard);
router.post('/logout-all', firebaseAuth, authController.logoutAllDevices);

// Extended Settings Routes
router.put('/profile', authRequired, authController.updateProfile);
router.post('/change-username', authLimiter, authRequired, authController.changeUsername);
router.post('/change-email/init', authLimiter, authRequired, authController.initChangeEmail);
router.post('/change-email/verify', authLimiter, authRequired, authController.verifyChangeEmail);
router.get('/mfa/status', authRequired, authController.getMfaStatus);
router.post('/mfa/setup/init', authLimiter, authRequired, authController.initMfaSetup);
router.post('/mfa/setup/verify', authLimiter, authRequired, authController.verifyMfaSetup);
router.post('/mfa/disable', authLimiter, authRequired, authController.disableMfa);
router.get('/mfa/login/status', firebaseAuth, authController.getMfaLoginStatus);
router.post('/mfa/login/verify', authLimiter, firebaseAuth, authController.verifyMfaLogin);
router.post('/deactivate', authLimiter, authRequired, authController.deactivateAccount);
router.post('/delete', authLimiter, authRequired, authController.deleteAccount);

// Session Management
router.get('/sessions', authRequired, authController.getActiveSessions);
router.delete('/sessions/:sessionId', authRequired, authController.revokeSession);

module.exports = router;

