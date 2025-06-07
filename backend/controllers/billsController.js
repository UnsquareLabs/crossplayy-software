const Bill = require('../models/bills.models');
const Customer = require('../models/customer.models');
const EditLog = require('../models/editLogs.models');

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

        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: 'Unauthorized: No user info found in token' });
        }

        const billedBy = req.user.email;
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

        // Normal hours 9 am to 10 pm
        // 1 player - 100
        // 2 player - 55/person/hour
        // 3 player - 50/person/hour
        // 4 player - 45/person/hour

        // PC - 50rs/person/hour

        // After 10 pm

        // Flat 60/person/hour 
        // Single player - 120rs

        // Ps or pc
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
                            ratePerPlayerHour = 45;
                            break;
                        case 3:
                            ratePerPlayerHour = 50;
                            break;
                        case 2:
                            ratePerPlayerHour = 55;
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
                        ratePerPlayerHour = 120;
                        totalAmount += durationHours * players * ratePerPlayerHour; // flat rate for single player
                    } else {
                        totalAmount += 120 * players * durationHours; // flat rate per player for multiplayer
                    }
                }
            }
        }

        const billData = {
            status: false,
            type,
            userName,
            contactNo,
            billedBy,
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
                // bill.amount = 0;
                bill.remainingAmt = 0;
            }

            unit = bill.pcUnits.find(u => u.pcId === pcId);
            if (!unit) {
                return res.status(404).json({ message: `PC ID ${pcId} not found in bill` });
            }

            unit.duration += extendTime;
            extendCost = extendTime === 15 ? 15 : 25;

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
                // bill.amount = 0;
                bill.remainingAmt = 0;
            }

            unit = bill.psUnits.find(u => u.psId === psId);
            if (!unit) {
                return res.status(404).json({ message: `PS ID ${psId} not found in bill` });
            }

            unit.duration += extendTime;
            // 💰 New PS pricing logic
            const players = unit.players || 1; // default to 1 if missing
            if (extendTime === 15) {
                if (players === 1) {
                    extendCost = 25;
                } else {
                    extendCost = 15;
                }
            } else if (extendTime === 30) {
                if (players === 1) {
                    extendCost = 50;
                } else if (players === 2) {
                    extendCost = 55;
                } else if (players === 3) {
                    extendCost = 50;
                } else if (players === 4) {
                    extendCost = 45;
                }
            }
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

        console.log(`🧾 Marking bill as paid: ID=${id}, Cash=${cash}, UPI=${upi}, Discount=${discount}, Wallet=${wallet}`);

        // Retrieve the bill
        const bill = await Bill.findById(id);
        if (!bill) {
            console.log('❌ Bill not found');
            return res.status(200).json({ message: 'Bill not found' });
        }

        if (wallet == -1) {
            console.log('⚠️ Wallet value is -1, resetting to 0');
            wallet = 0;
        }

        const totalDue = bill.amount;
        const effectivePaid = totalDue - discount - bill.paidAmt;

        console.log(`💰 Total due: ₹${totalDue}, Effective to be paid after discount: ₹${effectivePaid}`);

        // Try to fetch customer
        const foundCustomer = await Customer.findOne({ contactNo: bill.contactNo });


        if (wallet >= effectivePaid) {

            // // Zero out other payment methods
            // cash = 0;
            // upi = 0;

            if (foundCustomer) {
                foundCustomer.walletCredit -= effectivePaid;
                await foundCustomer.save();
            }

            // Mark bill as paid
            bill.status = true;
            // bill.cash = 0;
            // bill.upi = 0;
            bill.discount += discount;
            bill.wallet += effectivePaid;
            bill.paidAmt += effectivePaid;
            bill.remainingAmt = 0;
            bill.snacksTotal = 0;

            // Mark all snacks as paid
            bill.snacks = bill.snacks.map(snack => ({
                ...snack.toObject(), // convert Mongoose subdoc to plain object
                paidFor: true
            }));

            const updatedBill = await bill.save();
            return res.status(200).json({ message: 'Bill marked as paid using wallet balance', bill: updatedBill });
        } else {
            const totalPaid = cash + upi + wallet;

            if (totalPaid !== effectivePaid) {
                return res.status(400).json({
                    message: `Total payment (cash + upi + wallet = ₹${totalPaid}) must equal total due minus discount (₹${effectivePaid}).`
                });
            }

            if (foundCustomer) {
                foundCustomer.walletCredit -= wallet;
                await foundCustomer.save();
            }

            bill.status = true;
            bill.cash += cash;
            bill.upi += upi;
            bill.discount += discount;
            bill.wallet += wallet;
            bill.paidAmt += effectivePaid;
            bill.remainingAmt = 0;
            bill.snacksTotal = 0;

            // Mark all snacks as paid
            bill.snacks = bill.snacks.map(snack => ({
                ...snack.toObject(), // convert Mongoose subdoc to plain object
                paidFor: true
            }));

            const updatedBill = await bill.save();
            return res.status(200).json({ message: 'Bill marked as paid', bill: updatedBill });
        }
    } catch (err) {
        console.error('❗ Error in markBillAsPaid:', err);
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

        // Normalize pcUnits by keeping only relevant fields
        const normalizePCUnits = (units) =>
            units.map(({ pcId, duration }) => ({ pcId, duration }))
                .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

        // Normalize psUnits including noOfPlayers
        const normalizePSUnits = (units) =>
            units.map(({ psId, duration, players }) => ({ psId, duration, players }))
                .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

        const normalizedExistingPC = normalizePCUnits(bill.pcUnits);
        const normalizedIncomingPC = normalizePCUnits(pcUnits);

        const normalizedExistingPS = normalizePSUnits(bill.psUnits);
        const normalizedIncomingPS = normalizePSUnits(psUnits);

        // console.log('--- Field Comparison ---');
        // console.log(`cash: existing=${bill.cash}, incoming=${cash}`);
        // console.log(`upi: existing=${bill.upi}, incoming=${upi}`);
        // console.log(`wallet: existing=${bill.wallet}, incoming=${wallet}`);
        // console.log(`discount: existing=${bill.discount}, incoming=${discount}`);
        // console.log(`pcUnits: existing=${JSON.stringify(normalizedExistingPC)}, incoming=${JSON.stringify(normalizedIncomingPC)}`);
        // console.log(`psUnits: existing=${JSON.stringify(normalizedExistingPS)}, incoming=${JSON.stringify(normalizedIncomingPS)}`);

        const isSame =
            bill.cash === cash &&
            bill.upi === upi &&
            bill.wallet === wallet &&
            bill.discount === discount &&
            JSON.stringify(normalizedExistingPC) === JSON.stringify(normalizedIncomingPC) &&
            JSON.stringify(normalizedExistingPS) === JSON.stringify(normalizedIncomingPS);

        if (isSame) {
            // Remove the most recent edit log entry for this billId
            // Attempt to delete the most recent edit log entry for this billId
            const deletedLog = await EditLog.findOneAndDelete({ billId: id }, { sort: { timestamp: -1 } });

            if (deletedLog) {
                console.log(`Deleted edit log for billId: ${id}`);
            }
            console.log('No changes detected. Aborting update.');
            return res.status(400).json({ message: 'No changes detected' });
        }

        const bookingTimeUTC = new Date(bill.bookingTime);

        // Convert to IST using toLocaleString
        const bookingTimeISTString = bookingTimeUTC.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata"
        });
        const bookingTimeIST = new Date(bookingTimeISTString);

        // console.log("bookingTimeIST:", bookingTimeIST);

        const hourIST = bookingTimeIST.getHours();
        // console.log("hourIST:", hourIST);


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
                            ratePerPlayerHour = 45;
                            break;
                        case 3:
                            ratePerPlayerHour = 50;
                            break;
                        case 2:
                            ratePerPlayerHour = 55;
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
                        totalAmount += 120 * durationHours; // flat rate for single player
                    } else {
                        totalAmount += 120 * durationHours * players; // flat rate per player for multiplayer
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
            // Remove the most recent edit log entry for this billId
            // Attempt to delete the most recent edit log entry for this billId
            const deletedLog = await EditLog.findOneAndDelete({ billId: id }, { sort: { timestamp: -1 } });

            if (deletedLog) {
                console.log(`Deleted edit log for billId: ${id}`);
            }
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

        bill.amount -= bill.snacksTotal;
        bill.remainingAmt -= bill.snacksTotal;

        // Add snacks to bill
        const newSnacks = snacks.map(snack => ({
            name: snack.name,
            quantity: snack.quantity,
            price: snack.price,
            paidFor: false
        }));

        bill.snacks = [...bill.snacks, ...newSnacks];

        // Recalculate snacksTotal
        const updatedSnacksTotal = bill.snacks.filter(snack => !snack.paidFor).reduce((sum, snack) => {
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
