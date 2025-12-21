const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

router.get('/countries', metaController.listCountries);
router.get('/countries/:countryCode/states', metaController.listStates);

module.exports = router;

