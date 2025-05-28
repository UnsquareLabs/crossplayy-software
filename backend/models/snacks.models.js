const mongoose = require('mongoose');

const snackSchema = new mongoose.Schema({
    // snackId: {
    //     type: Number,
    //     required: true,
    //     unique: true
    // },
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        data: Buffer,       // Binary data
        contentType: String // e.g., "image/png" or "image/jpeg"
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Snack', snackSchema);
