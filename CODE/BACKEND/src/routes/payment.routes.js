/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Player routes
router.post('/', authenticate, authorize('PLAYER'), paymentController.createPayment);
router.get('/my-payments', authenticate, paymentController.getMyPayments);

// Host routes
router.get('/tournament/:tournamentId', authenticate, authorize('HOST', 'ADMIN'), paymentController.getPaymentsByTournament);

// Admin routes
router.get('/', authenticate, authorize('ADMIN'), paymentController.getAllPayments);
router.put('/:id/status', authenticate, authorize('HOST', 'ADMIN'), paymentController.updatePaymentStatus);

module.exports = router;
