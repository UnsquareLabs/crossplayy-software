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
                // console.log(durationHours);
                totalAmount += durationHours * ratePerHour;
            }
        } else {

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
            remainingAmt: totalAmount,
            gamingTotal: totalAmount,
            snacksTotal: 0,
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
        res.status(200).json({ message: 'Failed to fetch bills' });
    }
};

const extendBill = async (req, res) => {
    try {
        const { type, pcId, psId, extendTime } = req.body;

        if (![15, 30].includes(extendTime)) {
            return res.status(400).json({ message: 'extendTime must be 15 or 30 minutes' });
        }

        if (!['pc', 'ps'].includes(type)) {
            return res.status(400).json({ message: 'type must be either "pc" or "ps"' });
        }

        let bill, unit, extendCost;

        if (type === 'pc') {
            if (!pcId || typeof pcId !== 'string') {
                return res.status(400).json({ message: 'pcId is required and must be a string for type "pc"' });
            }

            bill = await Bill.findOne({ status: false, type: 'pc', 'pcUnits.pcId': pcId });

            if (!bill) {
                bill = await Bill.findOne({ status: true, type: 'pc', 'pcUnits.pcId': pcId }).sort({ bookingTime: -1 });
                if (!bill) {
                    return res.status(404).json({ message: `No bill found with PC ID ${pcId}` });
                }

                // Convert to unpaid and reset amounts
                bill.status = false;
                bill.paidAmt = bill.amount;
                bill.amount = 0;
                bill.remainingAmt = 0;
            }

            unit = bill.pcUnits.find(u => u.pcId === pcId);
            if (!unit) {
                return res.status(404).json({ message: `PC ID ${pcId} not found in bill` });
            }

            unit.duration += extendTime;
            extendCost = extendTime === 15 ? 20 : 25;

        } else {
            // type === 'ps'
            if (!psId || typeof psId !== 'string') {
                return res.status(400).json({ message: 'psId is required and must be a string for type "ps"' });
            }

            bill = await Bill.findOne({ status: false, type: 'ps', 'psUnits.psId': psId });

            if (!bill) {
                bill = await Bill.findOne({ status: true, type: 'ps', 'psUnits.psId': psId }).sort({ bookingTime: -1 });
                if (!bill) {
                    return res.status(404).json({ message: `No bill found with PS ID ${psId}` });
                }

                // Convert to unpaid and reset amounts
                bill.status = false;
                bill.paidAmt = bill.amount;
                bill.amount = 0;
                bill.remainingAmt = 0;
            }

            unit = bill.psUnits.find(u => u.psId === psId);
            if (!unit) {
                return res.status(404).json({ message: `PS ID ${psId} not found in bill` });
            }

            unit.duration += extendTime;
            extendCost = extendTime === 15 ? 30 : 40;
        }

        // Add extend cost to amount and remainingAmt
        bill.amount += extendCost;
        bill.remainingAmt += extendCost;
        bill.gamingTotal += extendCost;

        await bill.save();

        return res.status(200).json({ message: `${type.toUpperCase()} bill extended successfully`, bill });

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
        let { cash = 0, upi = 0, discount = 0, wallet = 0 } = req.body;

        // First, retrieve the bill to get its total amount
        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(200).json({ message: 'Bill not found' });
        }

        if (wallet == -1) {
            wallet = 0;
        }
        const totalDue = bill.amount;
        const totalPaid = cash + upi + wallet;
        const effectivePaid = totalDue - discount;

        if (effectivePaid !== totalPaid) {
            return res.status(400).json({ message: `Total payment (cash + upi = ₹${totalPaid}) must equal total due (₹${effectivePaid}).` });
        }

        // Update the bill with status = true, paidAmt = amount, remainingAmt = 0
        bill.status = true;
        bill.cash = cash;
        bill.upi = upi;
        bill.discount = discount;
        bill.wallet = wallet;
        bill.amount = bill.amount + bill.paidAmt;
        bill.paidAmt = 0;
        bill.remainingAmt = 0;

        const updatedBill = await bill.save();

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
        const { cash = 0, upi = 0, wallet = 0, discount = 0, pcUnits = [], psUnits = [] } = req.body;

        // Fetch existing bill
        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Use bookingTime from bill instead of current time
        const bookingTimeUTC = new Date(bill.bookingTime);
        // Convert bookingTime to IST by adding 5.5 hours
        const bookingTimeIST = new Date(bookingTimeUTC.getTime() + 5.5 * 60 * 60 * 1000);
        const hourIST = bookingTimeIST.getHours();

        let totalAmount = 0;
        const type = bill.type;

        if (type === 'pc') {
            // PC Pricing: before 10 PM ₹50/hr, else ₹60/hr
            const ratePerHour = hourIST < 22 ? 50 : 60;
            for (const unit of pcUnits) {
                const durationHours = unit.duration / 60; // minutes to hours
                totalAmount += durationHours * ratePerHour;
            }
        } else if (type === 'ps') {
            for (const unit of psUnits) {
                const { duration, players } = unit;
                if (!players || typeof players !== 'number' || players < 1) {
                    return res.status(400).json({ message: 'Each psUnit must have a valid number of players (>=1).' });
                }
                const durationHours = duration / 60;

                if (hourIST < 22) {
                    let ratePerPlayerHour = 0;
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
        } else {
            return res.status(400).json({ message: 'Invalid bill type.' });
        }


        // Add snacks total from bill.snacks
        let snackTotal = 0;
        if (Array.isArray(bill.snacks)) {
            for (const snack of bill.snacks) {
                const price = Number(snack.price) || 0;
                const quantity = Number(snack.quantity) || 0;
                snackTotal += price * quantity;
            }
        }


        totalAmount += snackTotal;

        // console.log(totalAmount);
        // Validate cash + upi - discount = totalAmount
        const totalPaid = Number(cash) + Number(upi) + Number(wallet) + Number(discount);
        totalAmount = Math.round(totalAmount);
        if (totalPaid !== totalAmount) {
            return res.status(400).json({
                message: `Invalid payment values: cash + upi - discount = ₹${totalPaid} but recalculated amount is ₹${totalAmount}. They must be equal.`
            });
        }

        const updatedData = {
            ...req.body,
            amount: totalAmount,
        };

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

const addSnacksToBill = async (req, res) => {
    try {
        const { billId, snacks } = req.body;

        if (!billId || !Array.isArray(snacks) || snacks.length === 0) {
            return res.status(400).json({ message: 'billId and a non-empty snacks array are required.' });
        }

        const bill = await Bill.findById(billId);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Add snacks to bill
        const newSnacks = snacks.map(snack => ({
            name: snack.name,
            quantity: snack.quantity,
            price: snack.price
        }));

        bill.snacks = [...bill.snacks, ...newSnacks];

        // Recalculate snacksTotal
        const updatedSnacksTotal = bill.snacks.reduce((sum, snack) => {
            return sum + (snack.quantity * snack.price);
        }, 0);
        bill.snacksTotal = updatedSnacksTotal;

        // Total = gamingTotal + snacksTotal
        bill.amount += updatedSnacksTotal;
        bill.remainingAmt += updatedSnacksTotal;

        await bill.save();

        res.status(200).json({ message: 'Snacks added to bill', bill });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add snacks to bill' });
    }
};

module.exports = {
    createBill,
    getAllBills,
    extendBill,
    markBillAsPaid,
    getBillById,
    deleteBill,
    editBill,
    addSnacksToBill
};
