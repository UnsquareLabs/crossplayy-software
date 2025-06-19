const express = require('express');
const router = express.Router();
const {
    createPrebooking,
    getAllPrebookings,
    updatePrebooking,
    deletePrebooking,
    convertDuePrebookings,
    checkAvailability
} = require('../controllers/prebookController');
const authMiddleware = require('../middleware/authMiddleware');
// console.log('✅ Prebook routes registered');


router.post('/create', authMiddleware, createPrebooking);
router.get('/', authMiddleware, getAllPrebookings);
router.put('/:id', authMiddleware, updatePrebooking);
router.delete('/:id', authMiddleware, deletePrebooking);
router.post('/convert-due', authMiddleware, convertDuePrebookings);
router.post('/check-availability',authMiddleware, checkAvailability);

module.exports = router;
