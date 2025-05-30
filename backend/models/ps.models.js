const mongoose = require('mongoose');

const psSchema = new mongoose.Schema({
    psId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: Boolean,
        default: false, // false = available, true = booked
        required: true
    },
    bookingTime: {
        type: Date,
        default: null // null when not booked
    },
    duration: {
        type: Number, // duration in minutes
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Ps', psSchema);
