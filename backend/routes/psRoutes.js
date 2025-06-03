const express = require('express');
const router = express.Router();
const { createPS, bookPS, getTimeLeft, extendPSBooking, unbookPS } = require('../controllers/psController');

// Routes for PS
router.post('/create', createPS);               // Create new PS
router.post('/book', bookPS);                   // Book PS
router.get('/timeleft/:psId', getTimeLeft);     // Get time left for PS
router.post('/extend-booking', extendPSBooking); // Extend PS booking
router.put('/unfreeze', unbookPS);

module.exports = router;
