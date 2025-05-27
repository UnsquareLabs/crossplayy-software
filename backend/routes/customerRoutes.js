const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/create', customerController.createCustomer);
router.get('/all', customerController.getAllCustomers);
router.put('/edit/:id', customerController.updateCustomer);
router.delete('/delete/:id', customerController.deleteCustomer);

module.exports = router;
