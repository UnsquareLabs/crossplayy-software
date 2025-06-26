const Bill = require('../models/bills.models');
const Customer = require('../models/customer.models');
const EditLog = require('../models/editLogs.models');

function getRateForPC(hour) {
    if (hour >= 9 && hour < 11) return 40;
    if (hour >= 22 || hour < 9) return 60;
    return 50;
}

function getRateForPS(hour, activePlayers) {
    if (hour >= 9 && hour < 11) return 40;
    if (hour >= 22 || hour < 9) return 70;
    switch (activePlayers) {
        case 1: return 100;
        case 2: return 60;
        case 3: return 50;
        case 4: return 40;
        default: return 40;
    }
}

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


        let totalAmount = 0;
        const now = new Date();
        const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        function getISTMinuteOffsetDate(base, offsetMin) {
            return new Date(base.getTime() + offsetMin * 60000);
        }



        // --- PC BILLING ---
        console.log("🔵 Starting PC Billing:");
        if (!Array.isArray(pcUnits) || pcUnits.length === 0) {
            console.log("ℹ️ No PC units to bill.");
        } else {
            for (const [i, unit] of pcUnits.entries()) {
                const duration = unit.duration;
                for (let m = 0; m < duration; m++) {
                    const currentMinute = getISTMinuteOffsetDate(nowIST, m);
                    const hour = currentMinute.getHours();
                    const rate = getRateForPC(hour);
                    const cost = rate / 60;
                    totalAmount += cost;
                    console.log(`[PC-${i + 1}] Minute: ${currentMinute.toLocaleTimeString("en-IN")} | Hr: ${hour} | ₹${rate}/hr → ₹${cost.toFixed(2)}`);
                }
            }
            console.log(`🧮 Total PC Amount: ₹${totalAmount.toFixed(2)}\n`);
        }


        // --- PS BILLING ---
        console.log("🟢 Starting PS Billing:");
        const psTimeline = {}; // key: minute offset → number of active players
        let normalizedPSUnits = [];
        if (!Array.isArray(psUnits) || psUnits.length === 0) {
            console.log("ℹ️ No PS units to bill.");
        } else {
            // 🔁 Create a normalized version instead of modifying the original
            normalizedPSUnits = psUnits.map(unit => {
                const playerCount = Number(unit.players) || 1;
                const duration = Number(unit.duration) || 0;

                const playersArray = [];
                for (let i = 1; i <= playerCount; i++) {
                    playersArray.push({
                        playerNo: i,
                        duration: duration // each player gets full duration
                    });
                }

                return {
                    psId: unit.psId,
                    duration: duration,
                    players: playersArray
                };
            });

            for (const [i, unit] of normalizedPSUnits.entries()) {
                if (!Array.isArray(unit.players)) {
                    console.warn(`⚠️ psUnit ${i + 1} has no players array.`);
                    continue;
                }

                for (const player of unit.players) {
                    const playerDuration = player.duration;
                    for (let m = 0; m < playerDuration; m++) {
                        psTimeline[m] = (psTimeline[m] || 0) + 1;
                    }
                }
            }

            for (const [minuteStr, activePlayers] of Object.entries(psTimeline)) {
                const m = parseInt(minuteStr, 10);
                const currentMinute = getISTMinuteOffsetDate(nowIST, m);
                const hour = currentMinute.getHours();
                const rate = getRateForPS(hour, activePlayers);
                const cost = (rate / 60) * activePlayers;
                totalAmount += cost;
                console.log(`[PS] Minute: ${currentMinute.toLocaleTimeString("en-IN")} | Hr: ${hour} | Players: ${activePlayers} | ₹${rate}/pp/hr → ₹${cost.toFixed(2)}`);
            }

            console.log(`🧮 Total PS Amount: ₹${totalAmount.toFixed(2)}\n`);
        }

        totalAmount = Math.round(totalAmount);
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
            billData.psUnits = normalizedPSUnits;
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

        const now = new Date();
        const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        function getISTMinuteOffsetDate(base, offsetMin) {
            return new Date(base.getTime() + offsetMin * 60000);
        }

        let bill, unit, extendCost = 0;

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
                bill.status = false;
                bill.paidAmt = bill.amount;
                bill.remainingAmt = 0;
            }

            unit = bill.pcUnits.find(u => u.pcId === pcId);
            if (!unit) {
                return res.status(404).json({ message: `PC ID ${pcId} not found in bill` });
            }

            const extendStart = unit.duration;
            unit.duration += extendTime;

            for (let i = 0; i < extendTime; i++) {
                const minuteTime = getISTMinuteOffsetDate(new Date(bill.bookingTime), extendStart + i);
                const hour = minuteTime.getHours();
                const rate = getRateForPC(hour);
                const cost = rate / 60;
                extendCost += cost;
                console.log(`[EXT-PC] ${minuteTime.toLocaleTimeString("en-IN")} | Hr: ${hour} | ₹${rate}/hr → ₹${cost.toFixed(2)}`);
            }

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
                bill.status = false;
                bill.paidAmt = bill.amount;
                bill.remainingAmt = 0;
            }

            unit = bill.psUnits.find(u => u.psId === psId);
            if (!unit) {
                return res.status(404).json({ message: `PS ID ${psId} not found in bill` });
            }

            const extendStart = unit.duration;
            unit.duration += extendTime;

            let activePlayers = Array.isArray(unit.players) ? unit.players.length : 1;

            if (Array.isArray(unit.players)) {
                unit.players.forEach(player => {
                    player.duration += extendTime;
                });
            }

            for (let i = 0; i < extendTime; i++) {
                const minuteTime = getISTMinuteOffsetDate(new Date(bill.bookingTime), extendStart + i);
                const hour = minuteTime.getHours();
                const rate = getRateForPS(hour, activePlayers);
                const cost = (rate / 60) * activePlayers;
                extendCost += cost;
                console.log(`[EXT-PS] ${minuteTime.toLocaleTimeString("en-IN")} | Hr: ${hour} | Players: ${activePlayers} | ₹${rate}/pp/hr → ₹${cost.toFixed(2)}`);
            }
        }
        extendCost = Math.round(extendCost);
        bill.amount += extendCost;
        bill.remainingAmt += extendCost;
        bill.gamingTotal += extendCost;

        await bill.save();

        return res.status(200).json({ message: `${type.toUpperCase()} bill extended successfully`, extendCost: extendCost.toFixed(2), bill });

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
        let { cash = 0, upi = 0, discount = 0, wallet = 0, loyalty = 0 } = req.body;

        console.log(`🧾 Marking bill as paid: ID=${id}, Cash=${cash}, UPI=${upi}, Discount=${discount}, Wallet=${wallet}, Loyalty=${loyalty}`);

        const bill = await Bill.findById(id);
        if (!bill) {
            console.log('❌ Bill not found');
            return res.status(404).json({ message: 'Bill not found' });
        }

        if (wallet == -1) wallet = 0;
        if (loyalty == -1) loyalty = 0;

        const totalDue = bill.amount;
        const effectivePaid = totalDue - discount - bill.paidAmt;
        const check = totalDue - discount;
        if (check < 0) {
            // console.log(totalDue-discount);
            return res.status(400).json({ message: 'totalDue - discount is Negative' });
        }

        console.log(`💰 Total due: ₹${totalDue}, Effective to be paid after discount: ₹${effectivePaid}`);

        const foundCustomer = await Customer.findOne({ contactNo: bill.contactNo });

        // Case 1: Wallet can fully pay
        if (wallet >= effectivePaid) {
            if (foundCustomer) {
                foundCustomer.walletCredit -= effectivePaid;
                await foundCustomer.save();
            }

            bill.status = true;
            bill.wallet += effectivePaid;
            bill.discount += discount;
            bill.paidAmt += effectivePaid;
            bill.remainingAmt = 0;
            bill.snacksTotal = 0;
            bill.snacks = bill.snacks.map(snack => ({
                ...snack.toObject(),
                paidFor: true
            }));

            const updatedBill = await bill.save();
            return res.status(200).json({ message: 'Bill marked as paid using wallet', bill: updatedBill });
        }

        // Case 2: Loyalty can fully pay
        if (loyalty >= effectivePaid) {
            if (foundCustomer) {
                foundCustomer.loyaltyPoints -= effectivePaid;
                await foundCustomer.save();
            }

            bill.status = true;
            bill.loyaltyPoints = (bill.loyaltyPoints || 0) + effectivePaid;
            bill.discount += discount;
            bill.paidAmt += effectivePaid;
            bill.remainingAmt = 0;
            bill.snacksTotal = 0;
            bill.snacks = bill.snacks.map(snack => ({
                ...snack.toObject(),
                paidFor: true
            }));

            const updatedBill = await bill.save();
            return res.status(200).json({ message: 'Bill marked as paid using loyalty points', bill: updatedBill });
        }

        // ✅ Case 3: Combined wallet + loyalty can fully pay (prefer wallet first)
        if ((wallet + loyalty) >= effectivePaid) {
            let usedWallet = Math.min(wallet, effectivePaid);
            let usedLoyalty = effectivePaid - usedWallet;

            console.log(`✅ Paying with wallet+loyalty combo: Used wallet ₹${usedWallet}, Used loyalty ₹${usedLoyalty}`);

            if (foundCustomer) {
                foundCustomer.walletCredit -= usedWallet;
                foundCustomer.loyaltyPoints -= usedLoyalty;
                await foundCustomer.save();
            }

            bill.status = true;
            bill.wallet += usedWallet;
            bill.loyaltyPoints += usedLoyalty;
            bill.discount += discount;
            bill.paidAmt += effectivePaid;
            bill.remainingAmt = 0;
            bill.snacksTotal = 0;
            bill.snacks = bill.snacks.map(snack => ({
                ...snack.toObject(),
                paidFor: true
            }));

            const updatedBill = await bill.save();
            return res.status(200).json({ message: 'Bill paid using combined wallet and loyalty', bill: updatedBill });
        }

        // Case 4: Combination of wallet + loyalty + upi + cash
        const totalPaid = cash + upi + wallet + loyalty;

        if (totalPaid !== effectivePaid) {
            return res.status(400).json({
                message: `Total payment (cash + upi + wallet + loyalty = ₹${totalPaid}) must equal total due minus discount (₹${effectivePaid}).`
            });
        }

        if (foundCustomer) {
            foundCustomer.walletCredit -= wallet;
            foundCustomer.loyaltyPoints -= loyalty;
            await foundCustomer.save();
        }

        bill.status = true;
        bill.cash += cash;
        bill.upi += upi;
        bill.wallet += wallet;
        bill.loyaltyPoints += loyalty;
        bill.discount += discount;
        bill.paidAmt += effectivePaid;
        bill.remainingAmt = 0;
        bill.snacksTotal = 0;
        bill.snacks = bill.snacks.map(snack => ({
            ...snack.toObject(),
            paidFor: true
        }));

        const updatedBill = await bill.save();
        return res.status(200).json({ message: 'Bill marked as paid using mixed methods', bill: updatedBill });

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

const calculateLoyaltyPoints = (amount) => {
    if (amount >= 360) return 30;
    if (amount >= 180) return 15;
    if (amount >= 150) return 10;
    if (amount >= 100) return 5;
    return 0;
};

const editBill = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            cash = 0, upi = 0, wallet = 0, loyaltyPoints = 0,
            discount = 0, pcUnits = [], psUnits = []
        } = req.body;

        // Fetch existing bill
        const bill = await Bill.findById(id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // ✅ Now resolve customer
        console.log('Fetching customer for contactNo:', bill.contactNo);
        const contactNo = bill.contactNo;
        const customer = await Customer.findOne({ contactNo });

        if (!customer) {
            console.log('Customer not found.');
            return res.status(404).json({ message: 'Customer not found.' });
        }

        // Step 0: Reverse loyalty from old bill total
        const prevTotalAmount = bill.amount;
        const prevLoyaltyEarned = calculateLoyaltyPoints(prevTotalAmount);
        console.log(`Reversing previous loyalty: -${prevLoyaltyEarned} points`);
        customer.loyaltyPoints -= prevLoyaltyEarned;

        // Step 1: Restore old balance
        const prevWallet = bill.wallet;
        const prevLoyalty = bill.loyaltyPoints;

        console.log(`Restoring old wallet ₹${prevWallet} and loyaltyPoints ${prevLoyalty}`);
        customer.walletCredit += prevWallet;
        customer.loyaltyPoints += prevLoyalty;
        await customer.save();

        // Step 2: Check if new values are allowed
        console.log(`Checking if new wallet ₹${wallet} and loyaltyPoints ${loyaltyPoints} are allowed`);

        if (wallet > customer.walletCredit) {
            console.log(`❌ Insufficient wallet balance. Available: ₹${customer.walletCredit}, Required: ₹${wallet}`);
            customer.walletCredit -= prevWallet;
            customer.loyaltyPoints -= prevLoyalty;
            customer.loyaltyPoints += prevLoyaltyEarned;
            await customer.save();

            const deletedLog = await EditLog.findOneAndDelete({ billId: id }, { sort: { timestamp: -1 } });
            if (deletedLog) console.log(`Deleted edit log for billId: ${id}`);

            return res.status(400).json({
                message: `Insufficient wallet balance. Available: ₹${customer.walletCredit}, Required more: ₹${wallet}`
            });
        }

        if (loyaltyPoints > customer.loyaltyPoints) {
            console.log(`❌ Insufficient loyalty points. Available: ${customer.loyaltyPoints}, Required: ${loyaltyPoints}`);
            customer.walletCredit -= prevWallet;
            customer.loyaltyPoints -= prevLoyalty;
            customer.loyaltyPoints += prevLoyaltyEarned;
            await customer.save();

            const deletedLog = await EditLog.findOneAndDelete({ billId: id }, { sort: { timestamp: -1 } });
            if (deletedLog) console.log(`Deleted edit log for billId: ${id}`);

            return res.status(400).json({
                message: `Insufficient loyalty points. Available: ${customer.loyaltyPoints}, Required: ${loyaltyPoints}`
            });
        }

        // Normalize units
        console.log('Normalizing PC and PS units');

        const normalizePCUnits = (units) =>
            units.map(({ pcId, duration }) => ({ pcId, duration }))
                .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

        const normalizePSUnits = (units) =>
            units.map(({ psId, duration, players }) => ({
                psId,
                duration,
                players: Array.isArray(players)
                    ? players
                        .map(({ playerNo, duration }) => ({ playerNo, duration }))
                        .sort((a, b) => a.playerNo - b.playerNo)
                    : players
            }))
                .sort((a, b) => a.psId.localeCompare(b.psId));

        const normalizedExistingPC = normalizePCUnits(bill.pcUnits);
        const normalizedIncomingPC = normalizePCUnits(pcUnits);
        const normalizedExistingPS = normalizePSUnits(bill.psUnits);
        const normalizedIncomingPS = normalizePSUnits(psUnits);

        const isSame =
            bill.cash === cash &&
            bill.upi === upi &&
            bill.wallet === wallet &&
            bill.loyaltyPoints === loyaltyPoints &&
            bill.discount === discount &&
            JSON.stringify(normalizedExistingPC) === JSON.stringify(normalizedIncomingPC) &&
            JSON.stringify(normalizedExistingPS) === JSON.stringify(normalizedIncomingPS);

        if (isSame) {
            console.log('🟡 No changes detected in bill. Deleting latest edit log.');
            const deletedLog = await EditLog.findOneAndDelete({ billId: id }, { sort: { timestamp: -1 } });
            if (deletedLog) console.log(`Deleted edit log for billId: ${id}`);
            return res.status(400).json({ message: 'No changes detected' });
        }

        // Recalculate total
        const bookingTimeUTC = new Date(bill.bookingTime);
        const bookingTimeIST = new Date(bookingTimeUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        console.log(`🔁 Recalculating total. Booking Time (IST): ${bookingTimeIST.toLocaleString()}, Bill Type: ${bill.type}`);

        let totalAmount = 0;

        function getISTMinuteOffsetDate(base, offsetMin) {
            return new Date(base.getTime() + offsetMin * 60000);
        }

        if (bill.type === 'pc') {
            console.log("🖥️ Recalculating PC Bill:");
            for (const [i, unit] of pcUnits.entries()) {
                const duration = unit.duration;
                for (let m = 0; m < duration; m++) {
                    const currentMinute = getISTMinuteOffsetDate(bookingTimeIST, m);
                    const hour = currentMinute.getHours();
                    const rate = getRateForPC(hour);
                    const cost = rate / 60;
                    totalAmount += cost;
                    console.log(`[PC-${i + 1}] Minute: ${currentMinute.toLocaleTimeString("en-IN")} | Hr: ${hour} | ₹${rate}/hr → ₹${cost.toFixed(2)}`);
                }
            }
            console.log(`🧮 Total PC Amount: ₹${totalAmount.toFixed(2)}\n`);

        } else if (bill.type === 'ps') {
            console.log("🎮 Recalculating PS Bill:");
            for (const [i, unit] of psUnits.entries()) {
                const timeline = new Array(unit.duration).fill(0);

                for (const player of unit.players || []) {
                    const playerDuration = player.duration;
                    const end = Math.min(unit.duration, playerDuration);
                    for (let m = 0; m < end; m++) {
                        timeline[m]++;
                    }
                }

                for (let m = 0; m < timeline.length; m++) {
                    const activePlayers = timeline[m];
                    if (activePlayers === 0) continue;

                    const currentMinute = getISTMinuteOffsetDate(bookingTimeIST, m);
                    const hour = currentMinute.getHours();
                    const rate = getRateForPS(hour, activePlayers);
                    const cost = (rate / 60) * activePlayers;
                    totalAmount += cost;

                    console.log(`[PS-${i + 1}] Minute: ${currentMinute.toLocaleTimeString("en-IN")} | Hr: ${hour} | Players: ${activePlayers} | ₹${rate}/pp/hr → ₹${cost.toFixed(2)}`);
                }
            }
            console.log(`🧮 Total PS Amount: ₹${totalAmount.toFixed(2)}\n`);

        } else {
            console.log('❌ Invalid bill type encountered:', bill.type);
            return res.status(400).json({ message: 'Invalid bill type.' });
        }

        // Round final amount to nearest rupee
        totalAmount = Math.round(totalAmount);
        console.log(`✅ Final Total Amount (rounded): ₹${totalAmount}`);


        // Snacks
        let snackTotal = 0;
        if (Array.isArray(bill.snacks)) {
            for (const snack of bill.snacks) {
                const price = Number(snack.price) || 0;
                const quantity = Number(snack.quantity) || 0;
                snackTotal += price * quantity;
            }
            console.log(`Snacks total: ₹${snackTotal}`);
        }

        totalAmount += snackTotal;
        totalAmount = Math.round(totalAmount);

        const totalPaid = Number(cash) + Number(upi) + Number(wallet) + Number(loyaltyPoints) + Number(discount);
        console.log(`Final total: ₹${totalAmount}, Total paid: ₹${totalPaid}`);

        if (totalPaid !== totalAmount) {
            console.log('❌ Invalid payment split.');
            customer.walletCredit -= prevWallet;
            customer.loyaltyPoints -= prevLoyalty;
            customer.loyaltyPoints += prevLoyaltyEarned;
            await customer.save();

            const deletedLog = await EditLog.findOneAndDelete({ billId: id }, { sort: { timestamp: -1 } });
            if (deletedLog) console.log(`Deleted edit log for billId: ${id}`);

            return res.status(400).json({
                message: `Invalid payment: total given ₹${totalPaid}, but required ₹${totalAmount}`
            });
        }

        // ✅ All good, update balances
        console.log(`✅ All good. Updating customer balances. Deducting wallet: ₹${wallet}, loyalty: ${loyaltyPoints}`);
        customer.walletCredit -= wallet;
        customer.loyaltyPoints -= loyaltyPoints;

        const earned = calculateLoyaltyPoints(totalAmount);
        console.log(`Adding new loyalty points: ${earned}`);
        customer.loyaltyPoints += earned;
        await customer.save();


        const updatedData = {
            ...req.body,
            amount: totalAmount,
        };

        const updatedBill = await Bill.findByIdAndUpdate(id, updatedData, { new: true });
        if (!updatedBill) {
            return res.status(404).json({ message: 'Bill not found after update' });
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
