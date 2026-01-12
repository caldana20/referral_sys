const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const productController = require('../controllers/productController');

router.get('/', authenticateToken, requireAdmin, productController.list);
router.get('/:id', authenticateToken, requireAdmin, productController.get);
router.post('/', authenticateToken, requireAdmin, productController.create);
router.patch('/:id', authenticateToken, requireAdmin, productController.update);
router.delete('/:id', authenticateToken, requireAdmin, productController.remove);

module.exports = router;

