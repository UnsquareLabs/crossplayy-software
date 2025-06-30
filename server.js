const path = require('path');
const express = require('express');
const app = require('./backend/app');  // your backend Express app
const open = require('open');

const PORT = process.env.PORT || 3002;

// Serve frontend static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Route root to login.html from public folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public','login', 'login.html'));
});

open(`http://localhost:${PORT}/login/login.html`);

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
