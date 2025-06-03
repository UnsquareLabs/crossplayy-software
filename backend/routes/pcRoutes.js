const express = require('express');
const router = express.Router();
const { createPC, bookPC, getTimeLeft, extendPCBooking, unbookPC } = require('../controllers/pcController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, createPC);            // Create new PC
router.post('/book', authMiddleware, bookPC);
router.get('/timeleft/:pcId', authMiddleware, getTimeLeft);
router.post('/extend-booking', authMiddleware, extendPCBooking);
router.put('/unfreeze', authMiddleware, unbookPC);

module.exports = router;
