const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const campaignController = require('../controllers/campaignController');

router.get('/', authenticateToken, requireAdmin, campaignController.list);
router.get('/:id', authenticateToken, requireAdmin, campaignController.get);
router.post('/', authenticateToken, requireAdmin, campaignController.create);
router.patch('/:id', authenticateToken, requireAdmin, campaignController.update);
router.delete('/:id', authenticateToken, requireAdmin, campaignController.remove);

module.exports = router;

