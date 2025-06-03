const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // adjust path
const { logBillEdit, getAllEditLogs } = require('../controllers/editLogsController');

router.post('/logs', authMiddleware, logBillEdit);
router.get('/all-logs', authMiddleware, getAllEditLogs);
module.exports = router;
