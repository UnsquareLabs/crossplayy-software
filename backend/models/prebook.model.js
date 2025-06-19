const mongoose = require('mongoose');

const prebookSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['pc', 'ps'],
        required: true
    },
    pcUnits: [
        {
            type: String, // or mongoose.Schema.Types.ObjectId if referencing another model
            required: true
        }
    ],
    psUnits: [
        {
            psId: {
                type: String
            },
            duration: {
                type: Number // in minutes
            },
            players: {
                type: Number,
                default: 1
            }
        }
    ],
    name: {
        type: String,
        required: true
    },
    contactNo: {
        type: String,
        required: true
    },
    scheduledDate: {
        type: Date,
        required: true // both date & time can be stored here
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    duration: {
        type: Number, // optional total duration in minutes
        required: true
    },
    isConvertedToBill: {
        type: Boolean,
        default: false
    },
    billedBy: { type: String, required: true },
});

module.exports = mongoose.model('Prebook', prebookSchema);
