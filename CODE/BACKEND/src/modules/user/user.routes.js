
const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authRequired: authenticate } = require('../../middleware/auth.middleware');
const achievementService = require('../../services/achievement.service');

// ─── Achievements ──────────────────────────────────────────────────────────────
router.get('/me/achievements', authenticate, async (req, res) => {
    try {
        const data = await achievementService.getUserAchievements(req.user.id);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Get my achievements error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch achievements' });
    }
});

router.get('/:id/achievements', async (req, res) => {
    try {
        const data = await achievementService.getUserAchievements(req.params.id);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Get user achievements error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch achievements' });
    }
});


router.get('/me/profile', authenticate, userController.getProfile);
router.patch('/me/profile', authenticate, userController.updateProfile);
router.post('/me/games', authenticate, userController.addGameProfile);
router.delete('/me/games/:id', authenticate, userController.removeGameProfile);
// router.delete('/games/:id', authenticateToken, userController.removeGameProfile); 

// Blocking
router.post('/block', authenticate, userController.blockUser);
router.post('/unblock', authenticate, userController.unblockUser);
router.get('/blocked', authenticate, userController.getBlockedUsers);

module.exports = router;
