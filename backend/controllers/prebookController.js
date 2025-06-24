const Prebook = require('../models/prebook.model');
const Bill = require('../models/bills.models');
const PC = require('../models/pc.models');
const PS = require('../models/ps.models');

// Updated checkAvailability function to handle both PC and PS bookings
const checkAvailability = async (req, res) => {
    try {
        const { type, pcUnits = [], psUnits = [], duration } = req.body;

        if (type !== 'pc' && type !== 'ps') {
            return res.status(400).json({ message: 'Invalid booking type. Must be either pc or ps.' });
        }

        const now = new Date();
        const utcNow = new Date(now.toISOString());
        const requestStart = new Date(utcNow);
        const requestEnd = new Date(utcNow.getTime() + duration * 60000);

        const endOfToday = new Date(utcNow);
        endOfToday.setUTCHours(23, 59, 59, 999);

        if (type === 'pc') {
            if (!Array.isArray(pcUnits) || pcUnits.length === 0) {
                return res.status(400).json({ message: 'At least one PC unit required' });
            }

            const invalidUnits = pcUnits.filter(unit => !/^PC\d+$/i.test(unit));
            if (invalidUnits.length > 0) {
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

            const conflicts = [];
            const requestedUnits = pcUnits.map(unit => unit.toUpperCase().replace(/^PC/, ''));

            for (const booking of todayBookings) {
                const bookingStart = new Date(booking.scheduledDate);
                const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

                for (const unit of booking.pcUnits) {
                    const normalizedUnit = unit.toUpperCase();

                    if (requestedUnits.includes(normalizedUnit)) {
                        const overlap =
                            (requestStart >= bookingStart && requestStart < bookingEnd) ||
                            (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
                            (requestStart <= bookingStart && requestEnd >= bookingEnd);

                        if (overlap) {
                            conflicts.push({
                                unit: normalizedUnit,
                                bookedFrom: bookingStart,
                                bookedUntil: bookingEnd,
                            });
                        }
                    }
                }
            }

            if (conflicts.length > 0) {
                const availableUnits = pcUnits.filter(unit =>
                    !conflicts.some(c => c.unit === unit.toUpperCase())
                );
                return res.status(409).json({
                    message: 'PC booking conflicts detected',
                    conflicts,
                    availableUnits
                });
            }

            return res.status(200).json({
                available: true,
                availableUnits: pcUnits,
                requestWindow: {
                    start: requestStart,
                    end: requestEnd
                }
            });
        }

        // PS Booking Handling
        if (!Array.isArray(psUnits) || psUnits.length === 0) {
            return res.status(400).json({ message: 'At least one PS unit required' });
        }

        const todayPSBookings = await Prebook.find({
            type: 'ps',
            scheduledDate: { $gte: utcNow, $lte: endOfToday },
            isConvertedToBill: false,
        }).lean();

        const conflicts = [];

        for (const requestUnit of psUnits) {
            const requestedPsId = requestUnit.psId;
            const reqDuration = requestUnit.duration;

            for (const booking of todayPSBookings) {
                const bookingStart = new Date(booking.scheduledDate);
                const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

                for (const bookedUnit of booking.psUnits) {
                    if (bookedUnit.psId === requestedPsId) {
                        const overlap =
                            (requestStart >= bookingStart && requestStart < bookingEnd) ||
                            (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
                            (requestStart <= bookingStart && requestEnd >= bookingEnd);

                        if (overlap) {
                            conflicts.push({
                                psId: bookedUnit.psId,
                                bookedFrom: bookingStart,
                                bookedUntil: bookingEnd,
                            });
                        }
                    }
                }
            }
        }

        if (conflicts.length > 0) {
            const availableUnits = psUnits.filter(u =>
                !conflicts.some(c => c.psId === u.psId)
            );
            return res.status(409).json({
                message: 'PS booking conflicts detected',
                conflicts,
                availableUnits
            });
        }

        return res.status(200).json({
            available: true,
            availableUnits: psUnits.map(u => u.psId),
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

module.exports = { checkAvailability };




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
        const now = new Date();
        const currentUTCMinute = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            0, 0
        ));
        const nextUTCMinute = new Date(currentUTCMinute.getTime() + 60000);

        console.log(`[${new Date().toISOString()}] Checking for bookings at ${currentUTCMinute.toISOString()}`);

        const duePrebooks = await Prebook.find({
            $and: [
                { scheduledDate: { $gte: currentUTCMinute, $lt: nextUTCMinute } },
                { isConvertedToBill: { $ne: true } }
            ]
        }).sort({ scheduledDate: 1 });

        const billsCreated = [];

        for (const booking of duePrebooks) {
            try {
                const { type, pcUnits, psUnits, name: userName, contactNo, duration, billedBy } = booking;

                if (!type || !userName || !contactNo || !duration || !billedBy) {
                    console.log(`⚠️ Skipping booking ${booking._id} - Missing required fields`);
                    continue;
                }

                const nowIST = new Date(currentUTCMinute.getTime() + 5.5 * 60 * 60 * 1000);
                const hourIST = nowIST.getHours();
                let totalAmount = 0;

                const billData = {
                    type,
                    userName,
                    contactNo,
                    billedBy,
                    bookingTime: new Date(),
                    status: false,
                    amount: 0,
                    remainingAmt: 0,
                    gamingTotal: 0,
                    snacksTotal: 0,
                };

                if (type === 'pc' && pcUnits?.length > 0) {
                    const ratePerHour = hourIST < 22 ? 50 : 60;
                    const durationHours = duration / 60;
                    totalAmount = durationHours * ratePerHour * pcUnits.length;

                    billData.pcUnits = pcUnits.map(unitId => ({
                        pcId: `PC${unitId}`,
                        duration
                    }));

                    for (const pcId of pcUnits) {
                        const fullPcId = `PC${pcId}`;
                        try {
                            await PC.findOneAndUpdate(
                                { pcId: fullPcId },
                                {
                                    bookingTime: new Date(),
                                    duration,
                                    status: true
                                },
                                { new: true }
                            );

                            setTimeout(async () => {
                                await PC.findOneAndUpdate(
                                    { pcId: fullPcId },
                                    { status: false, bookingTime: null, duration: 0 }
                                );
                                console.log(`⏱️ Auto-unbooked PC: ${fullPcId}`);
                            }, duration * 60 * 1000);

                            console.log(`✅ Booked PC: ${fullPcId} for ${duration} minutes`);
                        } catch (pcError) {
                            console.error(`❌ Failed to book PC ${fullPcId}:`, pcError);
                        }
                    }
                } else if (type === 'ps' && Array.isArray(psUnits) && psUnits.length > 0) {
                    for (const unit of psUnits) {
                        const { psId, duration, players = [] } = unit;

                        if (!Array.isArray(players) || players.length === 0) {
                            continue;
                        }

                        const timeline = new Array(duration).fill(0);
                        for (const player of players) {
                            const end = Math.min(duration, player.duration);
                            for (let i = 0; i < end; i++) {
                                timeline[i]++;
                            }
                        }

                        const timeCount = {};
                        for (const count of timeline) {
                            if (count === 0) continue;
                            timeCount[count] = (timeCount[count] || 0) + 1;
                        }

                        for (const [playerCountStr, minutes] of Object.entries(timeCount)) {
                            const playersActive = parseInt(playerCountStr);
                            const hours = minutes / 60;
                            let rate;

                            if (hourIST < 22) {
                                switch (playersActive) {
                                    case 1: rate = 100; break;
                                    case 2: rate = 55; break;
                                    case 3: rate = 50; break;
                                    case 4: rate = 45; break;
                                    default: rate = 40;
                                }
                            } else {
                                rate = 120;
                            }

                            totalAmount += rate * hours * playersActive;
                        }

                        // Auto-book this PS unit for max player duration
                        const durations = players.map(p => p.duration || 0);
                        console.log(`⏱️ Extracted player durations:`, durations);

                        const maxPlayerDuration = Math.max(...durations);
                        console.log(`🔍 Max player duration for ${psId}: ${maxPlayerDuration} minutes`);

                        try {
                            await PS.findOneAndUpdate(
                                { psId: `${psId}` },
                                {
                                    bookingTime: new Date(),
                                    duration: maxPlayerDuration,
                                    status: true
                                },
                                { new: true }
                            );

                            setTimeout(async () => {
                                await PS.findOneAndUpdate(
                                    { psId: `${psId}` },
                                    { status: false, bookingTime: null, duration: 0 }
                                );
                                console.log(`⏱️ Auto-unbooked PS: PS${psId}`);
                            }, maxDuration * 60 * 1000);
                        } catch (psError) {
                            console.error(`❌ Failed to book ${psId}:`, psError);
                        }
                    }

                    billData.psUnits = psUnits.map(u => ({
                        psId: u.psId,
                        duration: u.duration,
                        players: u.players
                    }));
                } else {
                    console.log(`⚠️ Skipping booking ${booking._id} - Invalid type or no units`);
                    continue;
                }

                billData.amount = totalAmount;
                billData.remainingAmt = totalAmount;
                billData.gamingTotal = totalAmount;

                const newBill = new Bill(billData);
                await newBill.save();

                booking.isConvertedToBill = true;
                await booking.save();

                billsCreated.push(newBill);
                console.log(`✅ Created ₹${totalAmount} bill for ${userName}'s ${type.toUpperCase()} booking`);
            } catch (bookingError) {
                console.error(`❌ Failed to convert booking ${booking._id}:`, bookingError);
            }
        }

        const endOfTodayUTC = new Date(Date.UTC(
            currentUTCMinute.getUTCFullYear(),
            currentUTCMinute.getUTCMonth(),
            currentUTCMinute.getUTCDate(),
            23, 59, 59, 999
        ));

        const remainingToday = await Prebook.find({
            $and: [
                { scheduledDate: { $gt: currentUTCMinute, $lte: endOfTodayUTC } },
                { isConvertedToBill: { $ne: true } }
            ]
        });

        return res.status(200).json({
            success: true,
            convertedCount: billsCreated.length,
            totalAmountConverted: billsCreated.reduce((sum, bill) => sum + bill.amount, 0),
            remainingCount: remainingToday.length,
            remainingPrebooks: remainingToday.map(pb => ({
                id: pb._id,
                time: new Date(pb.scheduledDate).toLocaleTimeString(),
                type: pb.type,
                userName: pb.name
            }))
        });
    } catch (error) {
        console.error("❌ Critical error in convertDuePrebookings:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
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
        // 🛑 Check availability before proceeding
        const scheduledStart = new Date(scheduledDate);
        const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);
        // Validate units based on type
        if (type === 'pc') {
            if (!pcUnits || !Array.isArray(pcUnits) || pcUnits.length === 0) {
                return res.status(400).json({ message: 'pcUnits must be a non-empty array for type "pc"' });
            }


            const todayBookings = await Prebook.find({
                type: 'pc',
                scheduledDate: {
                    $lte: scheduledEnd
                },
                isConvertedToBill: false,
            }).lean();

            const conflicts = [];
            const requestedUnits = pcUnits.map(unit => String(unit).toUpperCase());

            for (const booking of todayBookings) {
                const bookingStart = new Date(booking.scheduledDate);
                const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

                for (const unit of booking.pcUnits) {
                    const normalizedUnit = String(unit).toUpperCase();
                    if (requestedUnits.includes(normalizedUnit)) {
                        const overlap =
                            (scheduledStart >= bookingStart && scheduledStart < bookingEnd) ||
                            (scheduledEnd > bookingStart && scheduledEnd <= bookingEnd) ||
                            (scheduledStart <= bookingStart && scheduledEnd >= bookingEnd);

                        if (overlap) {
                            conflicts.push({
                                unit: normalizedUnit,
                                bookedFrom: bookingStart,
                                bookedUntil: bookingEnd
                            });
                        }
                    }
                }
            }

            if (conflicts.length > 0) {
                const availableUnits = pcUnits.filter(unit =>
                    !conflicts.some(c => c.unit === String(unit).toUpperCase())
                );
                return res.status(409).json({
                    message: 'Booking conflicts detected',
                    conflicts,
                    availableUnits
                });
            }

        } else if (type === 'ps') {
            if (!psUnits || !Array.isArray(psUnits) || psUnits.length === 0) {
                return res.status(400).json({ message: 'psUnits must be a non-empty array for type "ps"' });
            }

            // Validate structure of each unit
            for (const unit of psUnits) {
                if (!unit.psId || typeof unit.duration !== 'number' || !Array.isArray(unit.players) || unit.players.length === 0) {
                    return res.status(400).json({ message: 'Invalid psUnits structure. Each unit must have psId, duration, and at least one player.' });
                }

                for (const player of unit.players) {
                    if (typeof player.playerNo !== 'number' || typeof player.duration !== 'number') {
                        return res.status(400).json({ message: 'Each player must have playerNo and duration (both numbers).' });
                    }
                }
            }

            const todayBookings = await Prebook.find({
                type: 'ps',
                scheduledDate: { $lte: scheduledEnd },
                isConvertedToBill: false,
            }).lean();

            const conflicts = [];
            const requestedPsIds = psUnits.map(u => String(u.psId).toUpperCase());

            for (const booking of todayBookings) {
                const bookingStart = new Date(booking.scheduledDate);
                const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

                for (const unit of booking.psUnits || []) {
                    const bookedId = String(unit.psId).toUpperCase();
                    if (requestedPsIds.includes(bookedId)) {
                        const overlap =
                            (scheduledStart >= bookingStart && scheduledStart < bookingEnd) ||
                            (scheduledEnd > bookingStart && scheduledEnd <= bookingEnd) ||
                            (scheduledStart <= bookingStart && scheduledEnd >= bookingEnd);

                        if (overlap) {
                            conflicts.push({
                                unit: bookedId,
                                bookedFrom: bookingStart,
                                bookedUntil: bookingEnd
                            });
                        }
                    }
                }
            }

            if (conflicts.length > 0) {
                const availableUnits = psUnits
                    .map(u => u.psId)
                    .filter(id => !conflicts.some(c => c.unit === String(id).toUpperCase()));

                return res.status(409).json({
                    message: 'Booking conflicts detected',
                    conflicts,
                    availableUnits
                });
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
