const express = require('express');
const multer = require('multer');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.get('/', authenticateToken, requireAdmin, mediaController.list);
router.post('/', authenticateToken, requireAdmin, upload.single('file'), mediaController.upload);
router.delete('/:id', authenticateToken, requireAdmin, mediaController.remove);

module.exports = router;

