const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactNo: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    loyaltyPoints: {
        type: Number,
        default: 0
    },
    walletCredit: {
        type: Number,
        default: 0,       // default value 0
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value'
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema); 
