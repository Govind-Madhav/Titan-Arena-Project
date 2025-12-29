/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const hostController = require('./host.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { rateLimit } = require('express-rate-limit');

// Rate limiter for applications (prevent spam)
const applicationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 requests per windowMs
    message: 'Too many applications created from this IP, please try again after an hour'
});

// Submit Host Application
router.post('/apply', authenticate, applicationLimiter, hostController.applyForHost);

module.exports = router;
