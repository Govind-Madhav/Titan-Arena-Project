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

// Admin routes
router.get('/admin/kyc', authRequired, requireAdmin(), kycController.listKYCRequests);
router.patch('/admin/kyc/:id/approve', authRequired, requireAdmin(), kycController.approveKYC);
router.patch('/admin/kyc/:id/reject', authRequired, requireAdmin(), kycController.rejectKYC);

module.exports = router;
