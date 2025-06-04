const mongoose = require('mongoose');

const editLogSchema = new mongoose.Schema(
  {
    billId: {
      type: String,
      required: true,
      unique: true, // One document per billId
    },
    versions: [
      {
        version: {
          type: Number,
          required: true,
        },
        discount: {
          type: Number,
          required: true,
        },
        cash: {
          type: Number,
          required: true,
        },
        UPI: {
          type: Number,
          required: true,
        },
        wallet: {
          type: Number,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        pcUnits: [
          {
            pcId: {
              type: String,
              required: true,
            },
            duration: {
              type: Number,
              required: true,
            },
          },
        ],
        psUnits: [
          {
            psId: {
              type: String,
              required: true,
            },
            duration: {
              type: Number,
              required: true,
            },
            players: {
              type: Number,
              default: 1,
            },
          },
        ],
        editedBy: {
          type: String,
          required: true,
        },
        editedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EditLog', editLogSchema);
