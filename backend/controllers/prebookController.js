const Prebook = require('../models/prebook.model');
const Bill = require('../models/bills.models');
const PC = require('../models/pc.models');

const checkAvailability = async (req, res) => {
    try {
        const { pcUnits, duration } = req.body;
        console.log(`[DEBUG] Received check availability request for units: ${pcUnits}, duration: ${duration} min`);

        // Input validation
        if (!Array.isArray(pcUnits)) {
            console.warn(`[WARN] pcUnits is not an array`);
            return res.status(400).json({ message: 'pcUnits must be an array' });
        }

        if (pcUnits.length === 0) {
            console.warn(`[WARN] pcUnits array is empty`);
            return res.status(400).json({ message: 'At least one PC unit required' });
        }

        if (typeof duration !== 'number' || duration <= 0) {
            console.warn(`[WARN] Invalid duration: ${duration}`);
            return res.status(400).json({ message: 'Duration must be a positive number in minutes' });
        }

        const now = new Date();
        const utcNow = new Date(now.toISOString());
        const requestStart = new Date(utcNow);
        const requestEnd = new Date(utcNow.getTime() + duration * 60000);

        console.log(`[DEBUG] Current UTC time: ${utcNow.toISOString()}`);
        console.log(`[DEBUG] Booking window requested: ${requestStart.toISOString()} to ${requestEnd.toISOString()}`);

        // End of the current day in UTC
        const endOfToday = new Date(utcNow);
        endOfToday.setUTCHours(23, 59, 59, 999);

        const invalidUnits = pcUnits.filter(unit => !/^PC\d+$/i.test(unit));
        if (invalidUnits.length > 0) {
            console.warn(`[WARN] Invalid PC unit format detected: ${invalidUnits}`);
            return res.status(400).json({
                message: 'Invalid PC unit format',
                invalidUnits,
                expectedFormat: 'PC followed by numbers (e.g. PC1, PC2)'
            });
        }

        const todayBookings = await Prebook.find({
            type: 'pc',
            scheduledDate: { $gte: utcNow, $lte: endOfToday },
            isConvertedToBill: false,
        }).lean();

        console.log(`[DEBUG] Total prebookings fetched for today: ${todayBookings.length}`);

        const conflicts = [];
        const requestedUnits = pcUnits.map(unit => unit.toUpperCase().replace(/^PC/, ''));

        for (const booking of todayBookings) {
            const bookingStart = new Date(booking.scheduledDate);
            const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

            console.log(`[DEBUG] Checking booking ID ${booking._id} | Units: ${booking.pcUnits} | Time: ${bookingStart.toISOString()} - ${bookingEnd.toISOString()}`);

            for (const unit of booking.pcUnits) {
                const normalizedUnit = unit.toUpperCase();

                if (requestedUnits.includes(normalizedUnit)) {
                    const overlap =
                        (requestStart >= bookingStart && requestStart < bookingEnd) ||
                        (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
                        (requestStart <= bookingStart && requestEnd >= bookingEnd);

                    if (overlap) {
                        console.log(`[⚠️ CONFLICT] Unit ${normalizedUnit} overlaps with booking ID ${booking._id}`);
                        conflicts.push({
                            unit: normalizedUnit,
                            bookedFrom: bookingStart,
                            bookedUntil: bookingEnd,
                            conflictType: getConflictType(requestStart, requestEnd, bookingStart, bookingEnd)
                        });
                    }
                }
            }
        }

        if (conflicts.length > 0) {
            const availableUnits = pcUnits.filter(unit =>
                !conflicts.some(c => c.unit === unit.toUpperCase())
            );
            console.log(`[❌ UNAVAILABLE] Conflicts found. Returning available units: ${availableUnits}`);
            return res.status(409).json({
                message: 'Booking conflicts detected',
                conflicts,
                availableUnits
            });
        }

        console.log(`[✅ AVAILABLE] All requested units are available.`);
        return res.status(200).json({
            available: true,
            availableUnits: pcUnits,
            requestWindow: {
                start: requestStart,
                end: requestEnd
            }
        });

    } catch (err) {
        console.error('❌ Error checking availability:', err);
        return res.status(500).json({
            message: 'Server error while checking availability',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};



// Helper function to classify conflict type
function getConflictType(reqStart, reqEnd, bookStart, bookEnd) {
    if (reqStart >= bookStart && reqEnd <= bookEnd) return 'fully-contained';
    if (reqStart < bookStart && reqEnd > bookEnd) return 'fully-overlapping';
    if (reqStart < bookEnd && reqStart >= bookStart) return 'start-overlap';
    if (reqEnd > bookStart && reqEnd <= bookEnd) return 'end-overlap';
    return 'unknown';
}

const convertDuePrebookings = async (req, res) => {
    try {
        // Get current time in UTC, rounded to minute
        const now = new Date();
        const currentUTCMinute = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            0, 0  // Zero seconds and milliseconds
        ));

        const nextUTCMinute = new Date(currentUTCMinute.getTime() + 60000);

        console.log(`[${new Date().toISOString()}] Checking for bookings at minute ${currentUTCMinute.toISOString()}`);

        // Step 1: Find unconverted bookings for this exact minute
        const duePrebooks = await Prebook.find({
            $and: [
                {
                    scheduledDate: {
                        $gte: currentUTCMinute,
                        $lt: nextUTCMinute
                    }
                },
                { isConvertedToBill: { $ne: true } }
            ]
        }).sort({ scheduledDate: 1 });

        console.log(`Found ${duePrebooks.length} prebookings due at ${currentUTCMinute.getUTCHours()}:${currentUTCMinute.getUTCMinutes()}`);

        const billsCreated = [];

        // Convert each due prebooking
        for (const booking of duePrebooks) {
            try {
                const {
                    type,
                    pcUnits,
                    psUnits,
                    name: userName,
                    contactNo,
                    duration,
                    billedBy
                } = booking;

                // Validate required fields
                if (!type || !userName || !contactNo || !duration || !billedBy) {
                    console.log(`⚠️ Skipping booking ${booking._id} - Missing required fields`);
                    continue;
                }

                // Convert UTC to IST for pricing calculation
                const nowIST = new Date(currentUTCMinute.getTime() + 5.5 * 60 * 60 * 1000);
                const hourIST = nowIST.getHours();
                let totalAmount = 0;

                // Calculate amount based on type and time
                if (type === 'pc') {
                    // PC Pricing: before 10 PM ₹50/hr, else ₹60/hr
                    const ratePerHour = hourIST < 22 ? 50 : 60;
                    const durationHours = duration / 60;
                    totalAmount = durationHours * ratePerHour * (pcUnits?.length || 1);
                } else {
                    // PS Pricing
                    const players = psUnits?.[0]?.players || 1;
                    const durationHours = duration / 60;

                    if (hourIST < 22) {
                        // Normal hours pricing (9am-10pm)
                        switch (players) {
                            case 4:
                                totalAmount = durationHours * players * 45;
                                break;
                            case 3:
                                totalAmount = durationHours * players * 50;
                                break;
                            case 2:
                                totalAmount = durationHours * players * 55;
                                break;
                            case 1:
                                totalAmount = durationHours * 100;
                                break;
                            default:
                                // For more than 4 players, use 40/person/hour
                                totalAmount = durationHours * players * 40;
                        }
                    } else {
                        // After 10 PM pricing
                        if (players === 1) {
                            totalAmount = durationHours * 120; // flat rate for single player
                        } else {
                            totalAmount = durationHours * players * 60; // flat rate per player
                        }
                    }
                }

                // Prepare bill data
                const billData = {
                    type,
                    userName,
                    contactNo,
                    billedBy,
                    bookingTime: new Date(),
                    status: false,
                    amount: totalAmount,
                    remainingAmt: totalAmount,
                    gamingTotal: totalAmount,
                    snacksTotal: 0,

                };

                // Add units based on type
                if (type === 'pc' && pcUnits?.length > 0) {
                    billData.pcUnits = pcUnits.map(unitId => ({
                        pcId: `PC${unitId}`,
                        duration
                    }));
                    for (const pcId of pcUnits) {
                        const fullPcId = `PC${pcId}`;
                        try {
                            // Update PC status and timing
                            await PC.findOneAndUpdate(
                                { pcId: fullPcId },
                                {
                                    bookingTime: new Date(),
                                    duration,
                                    status: true,
                                },
                                { new: true }
                            );

                            // Set a timer to auto-unbook the PC
                            setTimeout(async () => {
                                await PC.findOneAndUpdate(
                                    { pcId: fullPcId },
                                    { status: false, bookingTime: null, duration: 0 }
                                );
                                console.log(`⏱️ Auto-unbooked PC: ${fullPcId}`);
                            }, duration * 60 * 1000); // duration in ms

                            console.log(`✅ Booked PC: ${fullPcId} for ${duration} minutes`);
                        } catch (pcError) {
                            console.error(`❌ Failed to book PC ${fullPcId}:`, pcError);
                        }
                    }
                } else if (type === 'ps' && psUnits?.length > 0) {
                    billData.psUnits = psUnits.map(unit => ({
                        psId: `PS${unit.psId || unit}`,
                        duration,
                        players: unit.players || 1
                    }));
                } else {
                    console.log(`⚠️ Skipping booking ${booking._id} - Invalid type or no units`);
                    continue;
                }

                // Create and save the bill
                const newBill = new Bill(billData);
                await newBill.save();

                // Mark prebooking as converted
                booking.isConvertedToBill = true;
                await booking.save();

                billsCreated.push(newBill);
                console.log(`✅ Created ₹${totalAmount} bill for ${userName}'s ${type} booking at ${currentUTCMinute.getUTCHours()}:${currentUTCMinute.getUTCMinutes()}`);

            } catch (bookingError) {
                console.error(`❌ Failed to convert booking ${booking._id}:`, bookingError);
            }
        }

        // Step 2: Get remaining prebookings for today (from current minute onward)
        const endOfTodayUTC = new Date(Date.UTC(
            currentUTCMinute.getUTCFullYear(),
            currentUTCMinute.getUTCMonth(),
            currentUTCMinute.getUTCDate(),
            23, 59, 59, 999
        ));

        const remainingToday = await Prebook.find({
            $and: [
                { scheduledDate: { $gt: currentUTCMinute, $lte: endOfTodayUTC } },
                { isConverted: { $ne: true } }
            ]
        }).sort({ scheduledDate: 1 });

        console.log(`Remaining today: ${remainingToday.length} prebookings after ${currentUTCMinute.getUTCHours()}:${currentUTCMinute.getUTCMinutes()}`);

        return res.status(200).json({
            success: true,
            currentMinute: `${currentUTCMinute.getUTCHours()}:${String(currentUTCMinute.getUTCMinutes()).padStart(2, '0')} UTC`,
            convertedCount: billsCreated.length,
            totalAmountConverted: billsCreated.reduce((sum, bill) => sum + bill.amount, 0),
            remainingCount: remainingToday.length,
            remainingPrebooks: remainingToday.map(pb => ({
                id: pb._id,
                time: `${new Date(pb.scheduledDate).getUTCHours()}:${String(new Date(pb.scheduledDate).getUTCMinutes()).padStart(2, '0')}`,
                type: pb.type,
                userName: pb.name
            }))
        });

    } catch (error) {
        console.error('❌ Critical error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};


// Create a new PC/PS prebooking
const createPrebooking = async (req, res) => {
    try {
        const {
            type,
            pcUnits,
            psUnits,
            name,
            contactNo,
            scheduledDate,
            duration
        } = req.body;

        // Basic field validation
        if (!type || !name || !contactNo || !scheduledDate || !duration) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Extract billedBy from user info in token
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: 'Unauthorized: No user info found in token' });
        }

        const billedBy = req.user.email;

        // Validate units based on type
        if (type === 'pc') {
            if (!pcUnits || !Array.isArray(pcUnits) || pcUnits.length === 0) {
                return res.status(400).json({ message: 'pcUnits must be a non-empty array for type "pc"' });
            }
        } else if (type === 'ps') {
            if (!psUnits || !Array.isArray(psUnits) || psUnits.length === 0) {
                return res.status(400).json({ message: 'psUnits must be a non-empty array for type "ps"' });
            }
        } else {
            return res.status(400).json({ message: 'type must be either "pc" or "ps"' });
        }

        const newBooking = new Prebook({
            type,
            pcUnits,
            psUnits,
            name,
            contactNo,
            scheduledDate,
            duration,
            billedBy
        });

        await newBooking.save();

        res.status(201).json({ message: 'Prebooking created successfully', booking: newBooking });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create prebooking' });
    }
};


// Get all prebookings
const getAllPrebookings = async (req, res) => {
    try {
        const now = new Date();
        const bookings = await Prebook.find().find({ scheduledDate: { $gte: now } }).sort({ scheduledDate: 1 });
        res.status(200).json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch prebookings' });
    }
};

// Edit an existing prebooking
const updatePrebooking = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updated = await Prebook.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({ message: 'Prebooking updated', booking: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update prebooking' });
    }
};

// Delete a prebooking
const deletePrebooking = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Prebook.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({ message: 'Prebooking deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete prebooking' });
    }
};

module.exports = {
    convertDuePrebookings,
    createPrebooking,
    getAllPrebookings,
    updatePrebooking,
    deletePrebooking,
    checkAvailability
};
