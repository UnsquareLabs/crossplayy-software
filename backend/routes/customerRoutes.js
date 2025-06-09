const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/createOrAdd', authMiddleware, customerController.createCustomerOrAdd);
router.post('/onlyCreate', authMiddleware, customerController.onlyCreateCustomer);
router.get('/all', authMiddleware, customerController.getAllCustomers);
router.put('/edit/:id', authMiddleware, customerController.updateCustomer);
router.delete('/delete/:id', authMiddleware, customerController.deleteCustomer);
router.get('/wallet/:contactNo', authMiddleware, customerController.getCustomerWalletByPhone);
router.get('/loyalty/:contactNo', authMiddleware, customerController.getCustomerLoyaltyPointsByPhone);

module.exports = router;
