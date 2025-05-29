const Bill = require('../models/bills.models');

// Get earnings analytics (grouped by date or hour)
const getEarningsAnalytics = async (req, res) => {
    try {
        const { rangeType, startDate, endDate } = req.body;

        const matchStage = {
            status: true, // only include paid bills
        };

        if (startDate && endDate) {
            matchStage.bookingTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        if (rangeType === 'hourly') {
            // Special case: return every bookingTime + amount (non-aggregated)
            const hourlyData = await Bill.find(matchStage).sort({ bookingTime: 1 }).select('bookingTime amount');

            const formatted = hourlyData.map(bill => ({
                time: bill.bookingTime,
                amount: bill.amount,
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
                    total: { $sum: "$amount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const formatted = aggregated.map(entry => ({
            label: entry._id,
            total: entry.total,
        }));

        res.status(200).json({ data: formatted });

    } catch (err) {
        console.error("Failed to generate analytics:", err);
        res.status(500).json({ message: "Analytics generation failed" });
    }
};

module.exports = {
    getEarningsAnalytics
};
