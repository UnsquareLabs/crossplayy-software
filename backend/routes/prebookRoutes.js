const express = require('express');
const router = express.Router();
const {
    createPrebooking,
    getAllPrebookings,
    updatePrebooking,
    deletePrebooking
} = require('../controllers/prebookController');
const authMiddleware = require('../middleware/authMiddleware');
// console.log('✅ Prebook routes registered');


router.post('/create', authMiddleware, createPrebooking);
router.get('/', authMiddleware, getAllPrebookings);
router.put('/:id', authMiddleware, updatePrebooking);
router.delete('/:id', authMiddleware, deletePrebooking);

module.exports = router;
