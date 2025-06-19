const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Public route (no token needed)
router.get('/public', (req, res) => {
  res.json({ message: 'This is a public route.' });
});
router.get('/test', (req, res) => {
  res.json({ message: 'This is a test route.' });
});
// Protected route (token needed)
router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: `This is a protected route. User ID: ${req.user.id}` });
});

module.exports = router;
