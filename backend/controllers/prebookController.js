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




// Helper function to classify conflict type
function getConflictType(reqStart, reqEnd, bookStart, bookEnd) {
    if (reqStart >= bookStart && reqEnd <= bookEnd) return 'fully-contained';
    if (reqStart < bookStart && reqEnd > bookEnd) return 'fully-overlapping';
    if (reqStart < bookEnd && reqStart >= bookStart) return 'start-overlap';
    if (reqEnd > bookStart && reqEnd <= bookEnd) return 'end-overlap';
    return 'unknown';
}
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

        console.log(`[${new Date().toISOString()}] 🔍 Checking for bookings between ${currentUTCMinute.toISOString()} and ${nextUTCMinute.toISOString()}`);

        const duePrebooks = await Prebook.find({
            $and: [
                { scheduledDate: { $gte: currentUTCMinute, $lt: nextUTCMinute } },
                { isConvertedToBill: { $ne: true } }
            ]
        }).sort({ scheduledDate: 1 });

        console.log(`📋 Found ${duePrebooks.length} due prebookings to convert`);

        const billsCreated = [];

        for (const booking of duePrebooks) {
            console.log(`\n⚙️ Processing booking: ${booking._id}`);
            try {
                const { type, pcUnits, psUnits, name: userName, contactNo, duration } = booking;

                if (!type || !userName || !contactNo || !duration) {
                    console.log(`⚠️ Skipping booking ${booking._id} - Missing required fields`);
                    continue;
                }
                // Extract billedBy from user info in token
                if (!req.user || !req.user.email) {
                    return res.status(401).json({ message: 'Unauthorized: No user info found in token' });
                }

                const billedBy = req.user.email;
                const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

                console.log(nowIST);
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
                    console.log(`🖥️ Booking PC units: ${pcUnits.map(u => u.pcId || u).join(", ")}`);
                    billData.pcUnits = pcUnits.map(unit => {
                        const pcId = typeof unit === 'object' ? unit.pcId : `PC${unit}`;
                        const dur = typeof unit === 'object' ? unit.duration : duration;
                        return { pcId, duration: dur };
                    });

                    for (const unit of billData.pcUnits) {
                        const { pcId, duration } = unit;
                        const unitStart = nowIST;
                        const unitEnd = new Date(unitStart.getTime() + duration * 60000);

                        const tenPM = new Date(unitStart);
                        tenPM.setHours(22, 0, 0, 0);

                        const nineAM = new Date(unitStart);
                        nineAM.setHours(9, 0, 0, 0);

                        const elevenAM = new Date(unitStart);
                        elevenAM.setHours(11, 0, 0, 0);

                        let crossesTenPM = false;
                        let crossesElevenAM = false;
                        const crossMinute = unitStart.getMinutes();

                        if (unitStart < tenPM && unitEnd > tenPM) {
                            crossesTenPM = true;
                            console.log(`⚠️ [${pcId}] booking crosses 10 PM — crossMinute = ${crossMinute}`);
                        }

                        if (unitStart >= nineAM && unitStart < elevenAM && unitEnd > elevenAM) {
                            crossesElevenAM = true;
                            console.log(`🎉 [${pcId}] booking crosses 11 AM — crossMinute = ${crossMinute}`);
                        }

                        for (let m = 0; m < duration; m++) {
                            const minuteTime = new Date(unitStart.getTime() + m * 60000);
                            const hour = minuteTime.getHours();
                            const minute = minuteTime.getMinutes();

                            let rate = getRateForPC(hour);

                            if (crossesTenPM && hour === 22 && minute <= crossMinute) {
                                rate = 50;
                                console.log(`🟡 [${pcId}] 10PM override applied at ${minuteTime.toLocaleTimeString()}`);
                            }

                            if (crossesElevenAM && hour === 11 && minute <= crossMinute) {
                                rate = 40;
                                console.log(`💚 [${pcId}] Happy Hour override applied at ${minuteTime.toLocaleTimeString()}`);
                            }

                            const cost = rate / 60;
                            totalAmount += cost;

                            console.log(`[${pcId}] ${minuteTime.toLocaleTimeString("en-IN")} | Hr: ${hour} | ₹${rate}/hr → ₹${cost.toFixed(2)}`);
                        }

                        try {
                            await PC.findOneAndUpdate(
                                { pcId },
                                { bookingTime: new Date(), duration, status: true },
                                { new: true }
                            );

                            setTimeout(async () => {
                                await PC.findOneAndUpdate(
                                    { pcId },
                                    { status: false, bookingTime: null, duration: 0 }
                                );
                                console.log(`⏱️ Auto-unbooked PC: ${pcId}`);
                            }, duration * 60000);

                            console.log(`✅ Booked PC: ${pcId} for ${duration} minutes`);
                        } catch (pcError) {
                            console.error(`❌ Failed to book PC ${pcId}:`, pcError);
                        }
                    }

                    // --- PS Billing ---
                } else if (type === 'ps' && Array.isArray(psUnits) && psUnits.length > 0) {
                    console.log(`🎮 Booking PS units: ${psUnits.map(u => u.psId).join(", ")}`);
                    billData.psUnits = [];

                    for (const unit of psUnits) {
                        const { psId, players = [] } = unit;
                        if (players.length === 0) continue;

                        const timeline = {}; // minute -> active player count
                        const maxDur = Math.max(...players.map(p => p.duration));
                        const unitStart = nowIST;
                        const unitEnd = new Date(unitStart.getTime() + maxDur * 60000);

                        const tenPM = new Date(unitStart);
                        tenPM.setHours(22, 0, 0, 0);

                        const nineAM = new Date(unitStart);
                        nineAM.setHours(9, 0, 0, 0);

                        const elevenAM = new Date(unitStart);
                        elevenAM.setHours(11, 0, 0, 0);

                        let crossesTenPM = false;
                        let crossesElevenAM = false;
                        let crossMinute = unitStart.getMinutes();

                        if (unitStart < tenPM && unitEnd > tenPM) {
                            crossesTenPM = true;
                            console.log(`⚠️ [PS-${psId}] crosses 10 PM — will override rate after 10:${crossMinute} PM`);
                        }

                        if (unitStart >= nineAM && unitStart < elevenAM && unitEnd > elevenAM) {
                            crossesElevenAM = true;
                            console.log(`💚 [PS-${psId}] crosses 11 AM — will override rate after 11:${crossMinute} AM`);
                        }

                        // Build minute timeline
                        for (const player of players) {
                            for (let m = 0; m < player.duration; m++) {
                                timeline[m] = (timeline[m] || 0) + 1;
                            }
                        }

                        for (const [minuteStr, activePlayers] of Object.entries(timeline)) {
                            const m = parseInt(minuteStr, 10);
                            const minuteTime = new Date(unitStart.getTime() + m * 60000);
                            const hour = minuteTime.getHours();
                            const minute = minuteTime.getMinutes();

                            let rate = getRateForPS(hour, activePlayers);
                            let overrideLabel = "";

                            if (crossesTenPM && hour === 22 && minute <= crossMinute) {
                                switch (activePlayers) {
                                    case 1: rate = 100; break;
                                    case 2: rate = 60; break;
                                    case 3: rate = 50; break;
                                    default: rate = 40; break;
                                }
                                overrideLabel = "🟡 10PM Override";
                            }

                            if (crossesElevenAM && hour === 11 && minute <= crossMinute) {
                                rate = 40;
                                overrideLabel = "💚 Happy Hour Override";
                            }

                            const cost = (rate / 60) * activePlayers;
                            totalAmount += cost;

                            console.log(`[PS-${psId}] ${minuteTime.toLocaleTimeString("en-IN")} | Hr: ${hour} | Players: ${activePlayers} | ₹${rate}/hr → ₹${cost.toFixed(2)} ${overrideLabel}`);
                        }


                        try {
                            await PS.findOneAndUpdate(
                                { psId },
                                { bookingTime: new Date(), duration: maxDur, status: true },
                                { new: true }
                            );

                            setTimeout(async () => {
                                await PS.findOneAndUpdate(
                                    { psId },
                                    { status: false, bookingTime: null, duration: 0 }
                                );
                                console.log(`⏱️ Auto-unbooked PS: ${psId}`);
                            }, maxDur * 60000);
                        } catch (err) {
                            console.error(`❌ Failed to book PS ${psId}:`, err);
                        }

                        billData.psUnits.push({ psId, duration: maxDur, players });
                    }
                }


                totalAmount = Math.round(totalAmount); // store whole number
                billData.amount = totalAmount;
                billData.remainingAmt = totalAmount;
                billData.gamingTotal = totalAmount;

                const newBill = new Bill(billData);
                await newBill.save();
                console.log(`💾 Saved bill for booking ${booking._id}`);

                booking.isConvertedToBill = true;
                await booking.save();
                console.log(`📝 Marked booking ${booking._id} as converted`);

                billsCreated.push(newBill);
                console.log(`✅ Created ₹${totalAmount.toFixed(2)} bill for ${userName} (${type.toUpperCase()})`);
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

        console.log(`📅 Remaining prebookings today: ${remainingToday.length}`);

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
            const now = new Date();
            const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

            const todayBookings = await Prebook.find({
                type: 'pc',
                scheduledDate: {
                    $gt: now,
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
            // 💥 Check live PC usage (status === true)
            const pcStatuses = await PC.find({ pcId: { $in: requestedUnits }, status: true }).lean();
            for (const pc of pcStatuses) {
                const pcEnd = new Date(pc.bookingTime.getTime() + (pc.duration || 0) * 60000);
                const overlap =
                    (scheduledStart >= pc.bookingTime && scheduledStart < pcEnd) ||
                    (scheduledEnd > pc.bookingTime && scheduledEnd <= pcEnd) ||
                    (scheduledStart <= pc.bookingTime && scheduledEnd >= pcEnd);

                if (overlap) {
                    conflicts.push({
                        unit: pc.pcId,
                        bookedFrom: pc.bookingTime,
                        bookedUntil: pcEnd,
                        source: "live"
                    });
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

            // 💥 Check live PS usage (status === true)
            const psStatuses = await PS.find({ psId: { $in: requestedPsIds }, status: true }).lean();
            for (const ps of psStatuses) {
                const psEnd = new Date(ps.bookingTime.getTime() + (ps.duration || 0) * 60000);
                const overlap =
                    (scheduledStart >= ps.bookingTime && scheduledStart < psEnd) ||
                    (scheduledEnd > ps.bookingTime && scheduledEnd <= psEnd) ||
                    (scheduledStart <= ps.bookingTime && scheduledEnd >= psEnd);

                if (overlap) {
                    conflicts.push({
                        unit: ps.psId,
                        bookedFrom: ps.bookingTime,
                        bookedUntil: psEnd,
                        source: "live"
                    });
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
