const Bill = require('../models/bills.models');

// Get earnings analytics with detailed breakdown (grouped by date or hour)
const getEarningsAnalytics = async (req, res) => {
    try {
        const { rangeType, startDate, endDate } = req.body;
        console.log("Received request for earnings analytics");
        console.log("rangeType:", rangeType);
        console.log("startDate:", startDate);
        console.log("endDate:", endDate);

        const matchStage = {
            status: true, // only include paid bills
        };

        if (startDate && endDate) {
            matchStage.bookingTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        console.log("Match Stage:", JSON.stringify(matchStage));

        if (rangeType === 'hourly') {
            console.log("Fetching hourly data...");
            const hourlyData = await Bill.find(matchStage)
                .sort({ bookingTime: 1 })
                .select('bookingTime amount discount cash upi loyalty wallet');

            console.log(`Found ${hourlyData.length} hourly entries`);

            const formatted = hourlyData.map(bill => ({
                time: bill.bookingTime,
                loyalty: bill.loyaltyPoints || 0,
                wallet: bill.wallet || 0,
                cash: bill.cash || 0,
                upi: bill.upi || 0,
                total: (bill.amount || 0) - (bill.discount || 0),  // total = amount - discount
            }));


            console.log("Hourly formatted data sample:", formatted[0]);

            return res.status(200).json({ data: formatted });
        }

        console.log("Fetching aggregated data...");

        const dateFormat = (() => {
            switch (rangeType) {
                case "daily": return "%Y-%m-%d";
                case "weekly": return "%Y-%U";
                case "monthly": return "%Y-%m";
                case "yearly": return "%Y";
                default: return "%Y-%m-%d";
            }
        })();

        console.log("Using date format:", dateFormat);

        const aggregated = await Bill.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$bookingTime" } },
                    loyalty: { $sum: { $ifNull: ["$loyaltyPoints", 0] } },
                    wallet: { $sum: { $ifNull: ["$wallet", 0] } },
                    // discount: { $sum: { $ifNull: ["$discount", 0] } },
                    cash: { $sum: { $ifNull: ["$cash", 0] } },
                    upi: { $sum: { $ifNull: ["$upi", 0] } },
                    total: {
                        $sum: {
                            $subtract: ["$amount", { $ifNull: ["$discount", 0] }]
                        }
                    },

                },
            },
            { $sort: { _id: 1 } },
        ]);

        console.log(`Aggregated ${aggregated.length} records`);

        const formatted = aggregated.map(entry => ({
            label: entry._id,
            loyalty: entry.loyalty,
            wallet: entry.wallet,
            cash: entry.cash,
            upi: entry.upi,
            total: entry.total,
        }));


        console.log("Aggregated formatted data sample:", formatted[0]);

        res.status(200).json({ data: formatted });

    } catch (err) {
        console.error("Failed to generate analytics:", err);
        res.status(500).json({ message: "Analytics generation failed" });
    }
};


// Get cash vs UPI payment analytics (keeping original functionality)
const getPaymentMethodAnalytics = async (req, res) => {
    try {
        const { rangeType, startDate, endDate } = req.body;

        const matchStage = {
            status: true, // Only include paid bills
        };

        if (startDate && endDate) {
            matchStage.bookingTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Handle hourly separately (non-aggregated)
        if (rangeType === 'hourly') {
            const hourlyData = await Bill.find(matchStage)
                .sort({ bookingTime: 1 })
                .select('bookingTime cash upi');

            const formatted = hourlyData.map(bill => ({
                time: bill.bookingTime,
                cash: bill.cash || 0,
                upi: bill.upi || 0,
            }));

            return res.status(200).json({ data: formatted });
        }

        // Other groupings
        const dateFormat = (() => {
            switch (rangeType) {
                case "daily": return "%Y-%m-%d";
                case "weekly": return "%Y-%U";
                case "monthly": return "%Y-%m";
                case "yearly": return "%Y";
                default: return "%Y-%m-%d";
            }
        })();

        const aggregated = await Bill.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$bookingTime" } },
                    cash: { $sum: { $ifNull: ["$cash", 0] } },
                    upi: { $sum: { $ifNull: ["$upi", 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const formatted = aggregated.map(entry => ({
            label: entry._id,
            cash: entry.cash,
            upi: entry.upi,
        }));

        res.status(200).json({ data: formatted });

    } catch (err) {
        console.error("Failed to generate payment method analytics:", err);
        res.status(500).json({ message: "Payment method analytics failed" });
    }
};

module.exports = {
    getEarningsAnalytics,
    getPaymentMethodAnalytics
};