/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const walletController = require('./wallet.controller');
const { authRequired } = require('../../middleware/auth.middleware');
const { requireNotBanned } = require('../../middleware/role.middleware');

// All wallet routes require auth and non-banned status
router.use(authRequired, requireNotBanned);

// Get wallet balance
router.get('/', walletController.getWallet);

// Get transaction history
router.get('/transactions', walletController.getTransactions);

// Update billing details
router.put('/billing', walletController.updateBillingAddress);

// Deposit flow
router.post('/deposit/init', walletController.initDeposit);
router.post('/deposit/verify', walletController.verifyDeposit);

// Withdrawal
router.post('/withdraw', walletController.requestWithdraw);
router.get('/withdrawals', walletController.getMyWithdrawals);

// Simulated Transactions (Test Mode)
router.post('/test-deposit', walletController.simulateDeposit);
router.post('/test-withdraw', walletController.simulateWithdrawal);

module.exports = router;
