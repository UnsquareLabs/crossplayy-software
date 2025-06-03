const express = require('express');
const router = express.Router();
const multer = require('multer');
const snackController = require('../controllers/snackController');
const authMiddleware = require('../middleware/authMiddleware');

// Multer setup to store image in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.post('/create', authMiddleware, upload.single('image'), snackController.addSnack);
router.get('/all', authMiddleware, snackController.getAllSnacks);
router.put("/editQuant/:id", authMiddleware, snackController.editSnackQuantity);
router.put("/edit/:id", authMiddleware, upload.single("image"), snackController.editSnack);
router.delete('/delete/:id', authMiddleware, snackController.deleteSnack);
router.get('/image/:id', authMiddleware, snackController.getSnackImage);
router.put('/consume/:snackId', authMiddleware, snackController.consumeSnackQuantity);

module.exports = router;
