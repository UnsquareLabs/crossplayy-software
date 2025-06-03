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
  gamingTotal: {
    type: Number,
    default: 0
  },
  snacksTotal: {
    type: Number,
    default: 0
  },
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
  },
  remainingAmt: {
    type: Number,
    default: 0 // or omit `default` if you want it to be manually set
  },
  paidAmt: {
    type: Number,
    default: 0
  },
  cash: {
    type: Number,
    default: 0
  },
  upi: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0 // discount amount in ₹
  },
  wallet: {
    type: Number,
    default: 0 // discount amount in ₹
  },
  snacks: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true } // unit price
    }
  ],
  billedBy: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Bill', billSchema);
