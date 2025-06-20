const Bill = require('../models/bills.models'); // Adjust the path as needed
const EditLog = require('../models/editLogs.models');

const logBillEdit = async (req, res) => {
    try {
        // console.log("sssssssssssssssssssssssssssssssssssssssssssss")
        console.log('Received request to log bill edit');

        const { billId } = req.body;
        console.log('billId from body:', billId);

        if (!billId) {
            console.log('No billId provided in request body');
            return res.status(400).json({ message: 'billId is required' });
        }

        if (!req.user || !req.user.email) {
            console.log('No user info or email in request');
            return res.status(401).json({ message: 'Unauthorized: No user email in token' });
        }
        console.log('User email from token:', req.user.email);

        // Fetch the bill
        const bill = await Bill.findById(billId);
        if (!bill) {
            console.log(`Bill not found for id: ${billId}`);
            return res.status(404).json({ message: 'Bill not found' });
        }
        console.log('Fetched bill:', bill);

        // Find existing edit log
        let editLog = await EditLog.findOne({ billId });
        console.log('Existing editLog found:', !!editLog);

        // Prepare new version entry
        const newVersion = {
            version: 1,
            discount: bill.discount,
            cash: bill.cash,
            UPI: bill.upi,
            wallet: bill.wallet,
            amount: bill.amount,
            pcUnits: bill.pcUnits,
            psUnits: bill.psUnits,
            editedBy: req.user.email,
            editedAt: new Date(),
        };
        console.log('Prepared newVersion:', newVersion);

        if (editLog) {
            const lastVersion = editLog.versions.length
                ? Math.max(...editLog.versions.map(v => v.version))
                : 0;
            newVersion.version = lastVersion + 1;
            console.log('Appending new version:', newVersion.version);
            editLog.versions.push(newVersion);
        } else {
            console.log('No existing editLog, creating new one');
            editLog = new EditLog({
                billId,
                versions: [newVersion],
            });
        }

        await editLog.save();
        console.log('Edit log saved successfully');

        return res.status(201).json({
            message: `Edit log ${editLog.versions.length === 1 ? 'created' : 'updated'} successfully`,
            editLog,
        });
    } catch (error) {
        console.error('Error logging bill edit:', error);
        return res.status(500).json({ message: 'Server error while creating edit log' });
    }
};



const getAllEditLogs = async (req, res) => {
    try {
        const editLogs = await EditLog.find().sort({ createdAt: -1 }); // most recent first
        return res.status(200).json({ editLogs });
    } catch (error) {
        console.error('Error fetching edit logs:', error);
        return res.status(500).json({ message: 'Server error while fetching edit logs' });
    }
};

module.exports = {
    logBillEdit,
    getAllEditLogs
}
