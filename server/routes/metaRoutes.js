const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

router.get('/countries', metaController.listCountries);
router.get('/countries/:countryCode/states', metaController.listStates);
router.get('/tenant', metaController.getTenantFromHost);

module.exports = router;

