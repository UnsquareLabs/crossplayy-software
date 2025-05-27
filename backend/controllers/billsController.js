const Bill = require('../models/bills.models');

// Create new bill
const createBill = async (req, res) => {
    try {
        const { pcUnits, userName, contactNo } = req.body;

        if (!pcUnits || !Array.isArray(pcUnits) || pcUnits.length === 0) {
            return res.status(400).json({ message: 'pcUnits is required and must be a non-empty array.' });
        }

        // Get current time in IST
        const nowUTC = new Date();
        // IST is UTC +5:30
        const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);

        const hourIST = nowIST.getHours();

        // Set rate based on IST time
        // Before 10 PM (22:00) → ₹50/hr, else ₹60/hr
        const ratePerHour = hourIST < 22 ? 50 : 60;

        // Calculate total amount
        let totalAmount = 0;
        for (const unit of pcUnits) {
            const durationHours = unit.duration / 60; // convert minutes to hours (fractional)
            totalAmount += durationHours * ratePerHour;
        }

        const bill = new Bill({
            status: false,
            pcUnits,
            userName,
            contactNo,
            amount: totalAmount,
            bookingTime: new Date()
        });

        await bill.save();

        res.status(201).json({ message: 'Bill created successfully', bill });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create bill' });
    }
};

// Get all bills (optional for testing/debugging)
const getAllBills = async (req, res) => {
    try {
        const bills = await Bill.find().sort({ bookingTime: -1 });
        res.status(200).json(bills);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch bills' });
    }
};

const extendBill = async (req, res) => {
    try {
        const { pcId, extendTime } = req.body;

        if (![15, 30].includes(extendTime)) {
            return res.status(200).json({ message: 'extendTime must be 15 or 30 minutes' });
        }
        if (!pcId || typeof pcId !== 'string') {
            return res.status(200).json({ message: 'pcId is required and must be a string' });
        }

        // Find unpaid bill containing the pcId in pcUnits
        const bill = await Bill.findOne({
            status: false,
            'pcUnits.pcId': pcId
        });

        if (!bill) {
            return res.status(200).json({ message: `No unpaid bill found with PC ID ${pcId}` });
        }

        // Find the pcUnit inside the bill
        const pcUnit = bill.pcUnits.find(unit => unit.pcId === pcId);

        if (!pcUnit) {
            return res.status(200).json({ message: `PC ID ${pcId} not found in the bill's pcUnits` });
        }

        // Extend duration
        pcUnit.duration += extendTime;

        // Calculate additional amount
        let extendCost = 0;
        if (extendTime === 15) {
            extendCost = 20;
        } else if (extendTime === 30) {
            extendCost = 25;
        }

        bill.amount += extendCost;

        await bill.save();

        res.status(200).json({ message: 'Bill extended successfully', bill });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to extend bill' });
    }
};

const getBillById = async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(`🔍 Fetching bill with ID: ${id}`);

        const bill = await Bill.findById(id);
        // console.log('📦 Bill found:', bill);

        if (!bill) {
            // console.warn('❌ Bill not found in DB');
            return res.status(404).json({ message: 'Bill not found' });
        }

        res.status(200).json(bill);
    } catch (err) {
        // console.error('💥 Error in getBillById:', err);
        res.status(500).json({ message: 'Failed to fetch bill', error: err.message });
    }
};


const markBillAsPaid = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedBill = await Bill.findByIdAndUpdate(
            id,
            { status: true },
            { new: true }
        );

        if (!updatedBill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        res.status(200).json({ message: 'Bill marked as paid', bill: updatedBill });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update bill status' });
    }
};

const deleteBill = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedBill = await Bill.findByIdAndDelete(id);

        if (!deletedBill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        res.status(200).json({ message: 'Bill deleted successfully', bill: deletedBill });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete bill' });
    }
};

const editBill = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const updatedBill = await Bill.findByIdAndUpdate(id, updatedData, { new: true });

        if (!updatedBill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        res.status(200).json({ message: 'Bill updated successfully', bill: updatedBill });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update bill' });
    }
};

module.exports = {
    createBill,
    getAllBills,
    extendBill,
    markBillAsPaid,
    getBillById,
    deleteBill,
    editBill
};
