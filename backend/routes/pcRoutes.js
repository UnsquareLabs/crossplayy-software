const express = require('express');
const router = express.Router();
const { createPC, bookPC, getTimeLeft, extendPCBooking, unbookPC } = require('../controllers/pcController');

router.post('/create', createPC);            // Create new PC
router.post('/book', bookPC);
router.get('/timeleft/:pcId', getTimeLeft);
router.post('/extend-booking', extendPCBooking);
router.put('/unfreeze', unbookPC);

module.exports = router;
