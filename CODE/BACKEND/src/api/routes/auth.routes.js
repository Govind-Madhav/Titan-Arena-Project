/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/controllers/auth.controller');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
