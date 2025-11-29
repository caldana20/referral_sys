const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/import', authenticateToken, requireAdmin, upload.single('file'), userController.importClients);
router.get('/', authenticateToken, requireAdmin, userController.getUsers);
router.post('/', authenticateToken, requireAdmin, userController.createUser);
router.delete('/:id', authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router;

