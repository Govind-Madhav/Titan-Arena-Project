const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Protected routes
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateMe);
router.get('/profile/:id', authenticate, userController.getProfile);

module.exports = router;
