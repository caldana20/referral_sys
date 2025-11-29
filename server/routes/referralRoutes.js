const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/', referralController.createReferral);
router.get('/', authenticateToken, requireAdmin, referralController.getReferrals);
router.post('/bulk-delete', authenticateToken, requireAdmin, referralController.bulkDeleteReferrals);
router.patch('/:id/status', authenticateToken, requireAdmin, referralController.updateReferralStatus);
router.get('/code/:code', referralController.getReferralByCode);

module.exports = router;

