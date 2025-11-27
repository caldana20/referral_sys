const express = require('express');
const router = express.Router();
const estimateController = require('../controllers/estimateController');

router.post('/', estimateController.createEstimate);

module.exports = router;

