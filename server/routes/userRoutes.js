const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/import', authenticateToken, requireAdmin, upload.single('file'), userController.importClients);
router.post('/send-invitations', authenticateToken, requireAdmin, userController.sendInvitations);
router.get('/validate-client-token', userController.validateClientToken); // Must come before /:clientId route
router.get('/', authenticateToken, requireAdmin, userController.getUsers);
router.post('/', authenticateToken, requireAdmin, userController.createUser);
router.get('/:clientId/generate-referral-link', authenticateToken, requireAdmin, userController.generateClientReferralLink);
router.patch('/:id', authenticateToken, requireAdmin, userController.updateUser);
router.delete('/:id', authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router;

