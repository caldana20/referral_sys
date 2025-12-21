const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Ensure logo directory exists
const uploadDir = path.join('uploads', 'tenant-logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Public endpoints for onboarding
router.post('/preview', tenantController.preview);
router.post('/confirm', tenantController.confirm);
router.get('/list-public', tenantController.listPublic);

// Authenticated admin endpoints
router.get('/settings', authenticateToken, requireAdmin, tenantController.getSettings);
router.patch('/settings', authenticateToken, requireAdmin, upload.single('logo'), tenantController.updateSettings);

module.exports = router;


