const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Public route for clients to see available rewards (Allow unauthenticated access if needed, or just remove auth for fetching active rewards)
// Note: In this system, creating a referral link requires being a User (Client), so they should have a token.
// However, for simplicity/robustness, we can allow authenticated users to fetch active rewards.
router.get('/active', rewardController.getActiveRewards);

// Admin routes
router.get('/', authenticateToken, requireAdmin, rewardController.getRewards);
router.post('/', authenticateToken, requireAdmin, rewardController.createReward);
router.delete('/:id', authenticateToken, requireAdmin, rewardController.deleteReward);
router.patch('/:id/toggle', authenticateToken, requireAdmin, rewardController.toggleReward);

module.exports = router;

