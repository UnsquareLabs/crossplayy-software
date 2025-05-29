const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.post('/earnings', analyticsController.getEarningsAnalytics);

module.exports = router;