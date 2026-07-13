/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const kycController = require('./kyc.controller');
const { authRequired } = require('../../middleware/auth.middleware');
const { requireNotBanned, requireAdmin } = require('../../middleware/role.middleware');

// Player/Host routes
router.post('/apply', authRequired, requireNotBanned, kycController.applyForHost);
router.get('/status', authRequired, kycController.getHostStatus);

// Stripe KYC routes
router.post('/stripe/session', authRequired, requireNotBanned, kycController.createStripeVerificationSession);
router.post('/stripe/webhook', kycController.handleStripeWebhook);

// Admin routes
router.get('/admin/kyc', authRequired, requireAdmin(), kycController.listKYCRequests);
router.get('/admin/kyc/:id', authRequired, requireAdmin(), kycController.getKYCRequestById);
router.patch('/admin/kyc/:id/approve', authRequired, requireAdmin(), kycController.approveKYC);
router.patch('/admin/kyc/:id/reject', authRequired, requireAdmin(), kycController.rejectKYC);
router.patch('/admin/kyc/:id/suspicious', authRequired, requireAdmin(), kycController.flagKYCAsSuspicious);

module.exports = router;
