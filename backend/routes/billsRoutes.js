const express = require('express');
const router = express.Router();
const billController = require('../controllers/billsController');

router.post('/create', billController.createBill);
router.get('/all', billController.getAllBills); // optional route for testing
router.post('/extend-bill', billController.extendBill); // optional route for testing
router.get('/:id', billController.getBillById);
router.put('/:id/pay', billController.markBillAsPaid);
router.put('/edit/:id', billController.editBill);
router.delete('/delete/:id', billController.deleteBill);
router.post('/addSnack', billController.addSnacksToBill); // optional route for testing

module.exports = router;
