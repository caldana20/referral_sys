const express = require('express');
const router = express.Router();
const senderController = require('../controllers/senderController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Admin-only per-tenant sender management
router.get('/', authenticateToken, requireAdmin, senderController.getSender);
router.post('/', authenticateToken, requireAdmin, senderController.createSender);
router.post('/test', authenticateToken, requireAdmin, senderController.sendTestEmail);

module.exports = router;


