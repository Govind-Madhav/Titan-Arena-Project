/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

// Stubbed controller - pending Drizzle migration
const stubHandler = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'This feature is currently under maintenance (Database Migration). Use /api/auth/me for user profile.'
    });
};

module.exports = {
    getMe: stubHandler,
    updateMe: stubHandler,
    getProfile: stubHandler
};
