const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  status: {
    type: Boolean,
    default: false // false = unpaid, true = paid
  },
  pcUnits: [
    {
      pcId: {
        type: String,
        required: true
      },
      duration: {
        type: Number, // in minutes
        required: true
      }
    }
  ],
  userName: {
    type: String,
    required: true
  },
  contactNo: {
    type: String,
    required: true
  },
  bookingTime: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Bill', billSchema);
