/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

// Stubbed local controller - pending Drizzle migration
const stubHandler = (req, res) => {
    res.status(501).json({
        success: false,
        message: 'This feature is currently under maintenance (Database Migration)'
    });
};

module.exports = {
    getWallet: stubHandler,
    deposit: stubHandler,
    withdraw: stubHandler,
    transfer: stubHandler,
    getTransactions: stubHandler,
    requestKYC: stubHandler,
    getKYCStatus: stubHandler
};
