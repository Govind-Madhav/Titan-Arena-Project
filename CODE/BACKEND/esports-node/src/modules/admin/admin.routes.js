const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authRequired } = require('../../middleware/auth.middleware');
const { requireAdmin, requireSuperAdmin } = require('../../middleware/role.middleware');

router.use(authRequired, requireAdmin());

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User management
router.get('/users', adminController.listUsers);
router.patch('/users/:id/ban', adminController.banUser);
router.patch('/users/:id/unban', adminController.unbanUser);
router.patch('/users/:id/role', requireSuperAdmin(), adminController.updateUserRole);

// Withdrawals
router.get('/withdrawals', adminController.listWithdrawals);
router.patch('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.patch('/withdrawals/:id/reject', adminController.rejectWithdrawal);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
