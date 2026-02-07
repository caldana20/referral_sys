const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middleware/authMiddleware');
const superAdminController = require('../controllers/superAdminController');

router.use(authenticateToken, requireSuperAdmin);

router.get('/tenants', superAdminController.listTenants);
router.get('/tenants/:id', superAdminController.getTenant);
router.patch('/tenants/:id/status', superAdminController.updateTenantStatus);
router.delete('/tenants/:id', superAdminController.softDeleteTenant);

module.exports = router;
