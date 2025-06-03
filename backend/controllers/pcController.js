const PC = require('../models/pc.models');
const createPC = async (req, res) => {
    try {
        const { pcId } = req.body;

        if (!pcId) {
            return res.status(400).json({ message: 'pcId is required' });
        }

        const existing = await PC.findOne({ pcId });
        if (existing) {
            return res.status(409).json({ message: 'PC with this ID already exists' });
        }

        const newPC = new PC({ pcId });
        await newPC.save();

        res.status(201).json({ message: 'PC created successfully', pc: newPC });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create PC' });
    }
};
// BOOK a PC
const bookPC = async (req, res) => {
    try {
        const { bookings } = req.body;

        if (!Array.isArray(bookings) || bookings.length === 0) {
            return res.status(200).json({ message: 'bookings array is required' });
        }

        const results = [];

        for (const { pcId, duration } of bookings) {
            if (!pcId || !duration) continue;

            const bookingTime = new Date();

            // Update PC status and timing
            const updatedPC = await PC.findOneAndUpdate(
                { pcId },
                {
                    bookingTime,
                    duration,
                    status: true,
                },
                { new: true, upsert: true }
            );

            // Set a timer to auto-unbook the PC
            setTimeout(async () => {
                await PC.findOneAndUpdate(
                    { pcId },
                    { status: false, bookingTime: null, duration: 0 }
                );
                console.log(`⏱️ Auto-unbooked PC: ${pcId}`);
            }, duration * 60 * 1000); // duration in ms

            results.push(updatedPC);
        }

        res.status(200).json({ message: 'PCs booked successfully', pcs: results });
    } catch (err) {
        console.error(err);
        res.status(200).json({ message: 'Booking failed' });
    }
};

// GET TIME LEFT for a PC
const getTimeLeft = async (req, res) => {
    try {
        const { pcId } = req.params;

        const pc = await PC.findOne({ pcId });

        if (!pc) return res.status(200).json({ message: 'PC not found' });

        if (!pc.status) {
            return res.status(200).json({ message: 'PC not currently booked' });
        }

        const now = new Date();
        const endTime = new Date(pc.bookingTime.getTime() + pc.duration * 60 * 1000);
        const diffMs = endTime - now;

        if (diffMs <= 0) {
            // Booking expired but not yet reset (fallback)
            await PC.findOneAndUpdate(
                { pcId },
                { status: false, bookingTime: null, duration: 0 }
            );
            return res.status(200).json({ message: 'Booking expired', timeLeft: 0 });
        }

        const timeLeftMinutes = Math.ceil(diffMs / (60 * 1000));
        res.status(200).json({ pcId, timeLeft: timeLeftMinutes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not fetch time left' });
    }
};

const extendPCBooking = async (req, res) => {
    try {
        const { pcId, extendDuration } = req.body;

        if (!pcId || !extendDuration || typeof extendDuration !== 'number') {
            return res.status(200).json({ message: 'pcId and extendDuration (in minutes) are required' });
        }

        // Find the current PC record
        const pc = await PC.findOne({ pcId });

        if (!pc || !pc.status) {
            return res.status(200).json({ message: 'PC not currently booked or does not exist' });
        }

        // Calculate new duration
        const newDuration = pc.duration + extendDuration;

        // Update PC document
        const updatedPC = await PC.findOneAndUpdate(
            { pcId },
            { duration: newDuration },
            { new: true }
        );

        // Clear any existing timeout logic – note: in-memory setTimeout cannot be canceled here
        // Set a new timeout from *now* using new total time
        const remainingTime = (newDuration * 60 * 1000) - (new Date() - new Date(pc.bookingTime));
        setTimeout(async () => {
            await PC.findOneAndUpdate(
                { pcId },
                { status: false, bookingTime: null, duration: 0 }
            );
            console.log(`⏱️ Auto-unbooked (after extension) PC: ${pcId}`);
        }, remainingTime);

        res.status(200).json({ message: 'Booking extended successfully', pc: updatedPC });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to extend booking' });
    }
};
const unbookPC = async (req, res) => {
    try {
        const { pcId } = req.body;

        if (!pcId) {
            return res.status(400).json({ message: 'pcId is required' });
        }

        const updatedPC = await PC.findOneAndUpdate(
            { pcId },
            {
                status: false,
                bookingTime: null,
                duration: 0,
            },
            { new: true }
        );

        if (!updatedPC) {
            return res.status(404).json({ message: `PC with ID ${pcId} not found` });
        }

        res.status(200).json({ message: 'PC unfrozen successfully', pc: updatedPC });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to unfreeze PC' });
    }
};

module.exports = {
    bookPC,
    getTimeLeft,
    createPC,
    extendPCBooking,
    unbookPC
};
