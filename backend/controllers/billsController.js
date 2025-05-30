const Bill = require('../models/bills.models');

// Create new bill
const createBill = async (req, res) => {
    try {
        const { type, pcUnits, psUnits, userName, contactNo } = req.body;

        if (!type || (type !== 'pc' && type !== 'ps')) {
            return res.status(400).json({ message: 'type is required and must be either "pc" or "ps"' });
        }

        if (!userName || !contactNo) {
            return res.status(400).json({ message: 'userName and contactNo are required' });
        }

        // Validate units according to type
        if (type === 'pc') {
            if (!pcUnits || !Array.isArray(pcUnits) || pcUnits.length === 0) {
                return res.status(400).json({ message: 'pcUnits is required and must be a non-empty array for type pc.' });
            }
        } else {
            if (!psUnits || !Array.isArray(psUnits) || psUnits.length === 0) {
                return res.status(400).json({ message: 'psUnits is required and must be a non-empty array for type ps.' });
            }
        }

        // Get current time in IST
        const nowUTC = new Date();
        const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);
        const hourIST = nowIST.getHours();

        let totalAmount = 0;

        if (type === 'pc') {
            // PC Pricing: before 10 PM ₹50/hr, else ₹60/hr
            const ratePerHour = hourIST < 22 ? 50 : 60;
            for (const unit of pcUnits) {
                const durationHours = unit.duration / 60; // minutes to hours
                totalAmount += durationHours * ratePerHour;
            }
        } else {
            // PS Pricing:
            // 4 players: Rs. 40/person/hour
            // 3 players: Rs. 45/person/hour
            // 2 players: Rs. 50/person/hour
            // 1 player: Rs. 100/hour
            // After 10 PM:
            // Multiplayer: Rs. 70/person
            // Single player: Rs. 150

            for (const unit of psUnits) {
                const { duration, players } = unit;
                if (!players || typeof players !== 'number' || players < 1) {
                    return res.status(400).json({ message: 'Each psUnit must have a valid number of players (>=1).' });
                }
                const durationHours = duration / 60;

                let ratePerPlayerHour = 0;
                if (hourIST < 22) {
                    switch (players) {
                        case 4:
                            ratePerPlayerHour = 40;
                            break;
                        case 3:
                            ratePerPlayerHour = 45;
                            break;
                        case 2:
                            ratePerPlayerHour = 50;
                            break;
                        case 1:
                            ratePerPlayerHour = 100;
                            break;
                        default:
                            // If players > 4, treat as 4 players pricing or error
                            ratePerPlayerHour = 40;
                    }
                    totalAmount += durationHours * players * ratePerPlayerHour;
                } else {
                    // After 10 PM pricing
                    if (players === 1) {
                        totalAmount += 150; // flat rate for single player
                    } else {
                        totalAmount += 70 * players; // flat rate per player for multiplayer
                    }
                }
            }
        }

        const billData = {
            status: false,
            type,
            userName,
            contactNo,
            amount: totalAmount,
            bookingTime: new Date()
        };

        if (type === 'pc') {
            billData.pcUnits = pcUnits;
        } else {
            billData.psUnits = psUnits;
        }

        const bill = new Bill(billData);
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
        const { type, pcId, psId, extendTime } = req.body;

        if (![15, 30].includes(extendTime)) {
            return res.status(400).json({ message: 'extendTime must be 15 or 30 minutes' });
        }

        if (type !== 'pc' && type !== 'ps') {
            return res.status(400).json({ message: 'type must be either "pc" or "ps"' });
        }

        if (type === 'pc') {
            if (!pcId || typeof pcId !== 'string') {
                return res.status(400).json({ message: 'pcId is required and must be a string for type "pc"' });
            }

            // Find unpaid bill with this pcId
            const bill = await Bill.findOne({
                status: false,
                type: 'pc',
                'pcUnits.pcId': pcId
            });

            if (!bill) {
                return res.status(404).json({ message: `No unpaid bill found with PC ID ${pcId}` });
            }

            const pcUnit = bill.pcUnits.find(unit => unit.pcId === pcId);
            if (!pcUnit) {
                return res.status(404).json({ message: `PC ID ${pcId} not found in bill` });
            }

            // Extend duration
            pcUnit.duration += extendTime;

            // Extend cost for PC
            let extendCost = extendTime === 15 ? 20 : 25;
            bill.amount += extendCost;

            await bill.save();

            return res.status(200).json({ message: 'PC bill extended successfully', bill });

        } else {
            // type === 'ps'
            if (!psId || typeof psId !== 'string') {
                return res.status(400).json({ message: 'psId is required and must be a string for type "ps"' });
            }

            // Find unpaid bill with this psId
            const bill = await Bill.findOne({
                status: false,
                type: 'ps',
                'psUnits.psId': psId
            });

            if (!bill) {
                return res.status(404).json({ message: `No unpaid bill found with PS ID ${psId}` });
            }

            const psUnit = bill.psUnits.find(unit => unit.psId === psId);
            if (!psUnit) {
                return res.status(404).json({ message: `PS ID ${psId} not found in bill` });
            }

            psUnit.duration += extendTime;

            // Extend cost for PS
            let extendCost = extendTime === 15 ? 30 : 40;
            bill.amount += extendCost;

            await bill.save();

            return res.status(200).json({ message: 'PS bill extended successfully', bill });
        }
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
