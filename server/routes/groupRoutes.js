const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, requireAdmin, groupController.list);
router.get('/:id', authenticateToken, requireAdmin, groupController.get);
router.post('/', authenticateToken, requireAdmin, groupController.create);
router.patch('/:id', authenticateToken, requireAdmin, groupController.update);
router.delete('/:id', authenticateToken, requireAdmin, groupController.remove);

module.exports = router;
