const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { authRequired } = require('../../middleware/auth.middleware');

router.use(authRequired);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;
