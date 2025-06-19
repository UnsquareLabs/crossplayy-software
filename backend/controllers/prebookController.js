const Prebook = require('../models/prebook.model');

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
        const bookings = await Prebook.find().sort({ scheduledDate: 1 });
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
    createPrebooking,
    getAllPrebookings,
    updatePrebooking,
    deletePrebooking
};
