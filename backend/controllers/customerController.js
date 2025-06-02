const Customer = require('../models/customer.models');

// Create or update loyalty
const createCustomerOrAdd = async (req, res) => {
    try {
        const { name, contactNo, loyaltyPoints = 0 } = req.body;

        if (!name || !contactNo) {
            return res.status(400).json({ message: 'Name and contactNo are required' });
        }

        const existingCustomer = await Customer.findOne({ contactNo });

        if (existingCustomer) {
            existingCustomer.loyaltyPoints += loyaltyPoints;
            await existingCustomer.save();
            return res.status(200).json({ message: 'Loyalty points updated', customer: existingCustomer });
        }

        const newCustomer = new Customer({ name, contactNo, loyaltyPoints });
        await newCustomer.save();
        res.status(201).json({ message: 'Customer created', customer: newCustomer });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating customer' });
    }
};
const onlyCreateCustomer = async (req, res) => {
    try {
        const { name, contactNo, loyaltyPoints = 0, walletCredit = 0 } = req.body;

        if (!name || !contactNo) {
            return res.status(400).json({ message: 'Name and contactNo are required' });
        }

        const existingCustomer = await Customer.findOne({ contactNo });

        if (existingCustomer) {
            return res.status(200).json({ message: 'Customer phone no already exists in db', customer: existingCustomer });
        }

        const newCustomer = new Customer({ name, contactNo, loyaltyPoints, walletCredit });
        await newCustomer.save();
        res.status(201).json({ message: 'Customer created', customer: newCustomer });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating customer' });
    }
};
const getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.find();
        res.status(200).json(customers);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching customers' });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedCustomer = await Customer.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json({ message: 'Customer updated', customer: updatedCustomer });
    } catch (err) {
        res.status(500).json({ message: 'Error updating customer' });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Customer.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json({ message: 'Customer deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting customer' });
    }
};

module.exports = {
    createCustomerOrAdd,
    onlyCreateCustomer,
    getAllCustomers,
    updateCustomer,
    deleteCustomer
};
