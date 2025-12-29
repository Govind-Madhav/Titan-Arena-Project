
const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authRequired: authenticate } = require('../../middleware/auth.middleware');

router.get('/me/profile', authenticate, userController.getProfile);
router.patch('/me/profile', authenticate, userController.updateProfile);
router.post('/me/games', authenticate, userController.addGameProfile);
router.delete('/me/games/:id', authenticate, userController.removeGameProfile);
// router.delete('/games/:id', authenticateToken, userController.removeGameProfile); 

module.exports = router;
