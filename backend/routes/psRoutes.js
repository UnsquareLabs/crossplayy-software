const express = require('express');
const router = express.Router();
const { createPS, bookPS, getTimeLeft, extendPSBooking, unbookPS } = require('../controllers/psController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes for PS
router.post('/create', authMiddleware, createPS);               // Create new PS
router.post('/book', authMiddleware, bookPS);                   // Book PS
router.get('/timeleft/:psId', authMiddleware, getTimeLeft);     // Get time left for PS
router.post('/extend-booking', authMiddleware, extendPSBooking); // Extend PS booking
router.put('/unfreeze', authMiddleware, unbookPS);

module.exports = router;
