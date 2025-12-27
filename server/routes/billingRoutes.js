const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Admin-triggered actions
router.post('/checkout', authenticateToken, requireAdmin, billingController.createCheckoutSession);
router.post('/portal', authenticateToken, requireAdmin, billingController.createPortalSession);

module.exports = router;

