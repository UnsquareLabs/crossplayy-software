const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const testRoutes = require('./routes/test');
const cors = require('cors');
const pcRoutes = require('./routes/pcRoutes');
const billRoutes = require('./routes/billsRoutes');
const customerRoutes = require('./routes/customerRoutes');
const snackRoutes = require('./routes/snacksRoutes');

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/pc', pcRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/customer', customerRoutes );
app.use('/api/snacks', snackRoutes);

// Basic error handling middleware (optional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Server error' });
});

module.exports = app;
