const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authRequired } = require('../../middleware/auth.middleware');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authRequired, authController.logout);

// Email verification routes
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Protected routes
router.get('/me', authRequired, authController.getMe);

module.exports = router;

