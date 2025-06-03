const express = require('express');
const router = express.Router();
const billController = require('../controllers/billsController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, billController.createBill);
router.get('/all', authMiddleware, billController.getAllBills); // optional route for testing
router.post('/extend-bill', authMiddleware, billController.extendBill); // optional route for testing
router.get('/:id', authMiddleware, billController.getBillById);
router.put('/:id/pay', authMiddleware, billController.markBillAsPaid);
router.put('/edit/:id', authMiddleware, billController.editBill);
router.delete('/delete/:id', authMiddleware, billController.deleteBill);
router.post('/addSnack', authMiddleware, billController.addSnacksToBill); // optional route for testing

module.exports = router;
