const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const getPaymentMethodAnalytics = require('../controllers/analyticsController');

router.post('/earnings', authMiddleware, analyticsController.getEarningsAnalytics);
router.post('/Payment-earnings', authMiddleware, analyticsController.getPaymentMethodAnalytics);

module.exports = router;