const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  status: {
    type: Boolean,
    default: false // false = unpaid, true = paid
  },
  type: {
    type: String,
    enum: ['pc', 'ps'],
    required: true
  },
  pcUnits: [
    {
      pcId: {
        type: String
      },
      duration: {
        type: Number // in minutes
      }
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
