const PS = require('../models/ps.models');

// CREATE a PS
const createPS = async (req, res) => {
    try {
        const { psId } = req.body;

        if (!psId) {
            return res.status(400).json({ message: 'psId is required' });
        }

        const existing = await PS.findOne({ psId });
        if (existing) {
            return res.status(409).json({ message: 'PS with this ID already exists' });
        }

        const newPS = new PS({ psId });
        await newPS.save();

        res.status(201).json({ message: 'PS created successfully', ps: newPS });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create PS' });
    }
};

// BOOK a PS
const bookPS = async (req, res) => {
    try {
        const { bookings } = req.body;

        if (!Array.isArray(bookings) || bookings.length === 0) {
            return res.status(200).json({ message: 'bookings array is required' });
        }

        const results = [];

        for (const { psId, duration } of bookings) {
            if (!psId || !duration) continue;

            const bookingTime = new Date();

            const updatedPS = await PS.findOneAndUpdate(
                { psId },
                {
                    bookingTime,
                    duration,
                    status: true,
                },
                { new: true, upsert: true }
            );

            setTimeout(async () => {
                await PS.findOneAndUpdate(
                    { psId },
                    { status: false, bookingTime: null, duration: 0 }
                );
                console.log(`⏱️ Auto-unbooked PS: ${psId}`);
            }, duration * 60 * 1000);

            results.push(updatedPS);
        }   

        res.status(200).json({ message: 'PSs booked successfully', ps: results });
    } catch (err) {
        console.error(err);
        res.status(200).json({ message: 'Booking failed' });
    }
};

// GET TIME LEFT for a PS
const getTimeLeft = async (req, res) => {
    try {
        const { psId } = req.params;

        const ps = await PS.findOne({ psId });

        if (!ps) return res.status(200).json({ message: 'PS not found' });

        if (!ps.status) {
            return res.status(200).json({ message: 'PS not currently booked' });
        }

        const now = new Date();
        const endTime = new Date(ps.bookingTime.getTime() + ps.duration * 60 * 1000);
        const diffMs = endTime - now;

        if (diffMs <= 0) {
            await PS.findOneAndUpdate(
                { psId },
                { status: false, bookingTime: null, duration: 0 }
            );
            return res.status(200).json({ message: 'Booking expired', timeLeft: 0 });
        }

        const timeLeftMinutes = Math.ceil(diffMs / (60 * 1000));
        res.status(200).json({ psId, timeLeft: timeLeftMinutes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not fetch time left' });
    }
};

// EXTEND PS Booking
const extendPSBooking = async (req, res) => {
    try {
        const { psId, extendDuration } = req.body;

        if (!psId || !extendDuration || typeof extendDuration !== 'number') {
            return res.status(200).json({ message: 'psId and extendDuration (in minutes) are required' });
        }

        const ps = await PS.findOne({ psId });

        if (!ps || !ps.status) {
            return res.status(200).json({ message: 'PS not currently booked or does not exist' });
        }

        const newDuration = ps.duration + extendDuration;

        const updatedPS = await PS.findOneAndUpdate(
            { psId },
            { duration: newDuration },
            { new: true }
        );

        const remainingTime = (newDuration * 60 * 1000) - (new Date() - new Date(ps.bookingTime));
        setTimeout(async () => {
            await PS.findOneAndUpdate(
                { psId },
                { status: false, bookingTime: null, duration: 0 }
            );
            console.log(`⏱️ Auto-unbooked (after extension) PS: ${psId}`);
        }, remainingTime);

        res.status(200).json({ message: 'Booking extended successfully', ps: updatedPS });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to extend booking' });
    }
};

module.exports = {
    createPS,
    bookPS,
    getTimeLeft,
    extendPSBooking
};
