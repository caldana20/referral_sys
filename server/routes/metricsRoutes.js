const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard', authenticateToken, requireAdmin, metricsController.getDashboardMetrics);
router.get('/recommendations', authenticateToken, requireAdmin, metricsController.getRecommendations);

module.exports = router;

