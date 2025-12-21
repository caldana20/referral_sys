const express = require('express');
const router = express.Router();
const estimateController = require('../controllers/estimateController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/', estimateController.createEstimate);
router.get('/:id', authenticateToken, requireAdmin, estimateController.getEstimateById);

module.exports = router;

