const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/earnings',authMiddleware, analyticsController.getEarningsAnalytics);

module.exports = router;