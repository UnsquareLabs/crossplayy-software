const express = require('express');
const router = express.Router();
const multer = require('multer');
const snackController = require('../controllers/snackController');

// Multer setup to store image in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.post('/create', upload.single('image'), snackController.addSnack);
router.get('/all', snackController.getAllSnacks);
router.put("/edit/:id", upload.single("image"), snackController.editSnack);
router.delete('/delete/:id', snackController.deleteSnack);
router.get('/image/:id', snackController.getSnackImage);

module.exports = router;
