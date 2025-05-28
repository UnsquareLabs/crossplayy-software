const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/createOrAdd', customerController.createCustomerOrAdd);
router.post('/onlyCreate', customerController.onlyCreateCustomer);
router.get('/all', customerController.getAllCustomers);
router.put('/edit/:id', customerController.updateCustomer);
router.delete('/delete/:id', customerController.deleteCustomer);

module.exports = router;
