const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

// Public endpoints for onboarding
router.post('/preview', tenantController.preview);
router.post('/confirm', tenantController.confirm);
router.get('/list-public', tenantController.listPublic);

module.exports = router;


