const Snack = require('../models/snacks.models'); // adjust path as needed

const addSnack = async (req, res) => {
    try {
        const {  name, quantity, price } = req.body;
        const imageFile = req.file;

        if (!name || !imageFile || quantity == null || price == null) {
            return res.status(400).json({ message: 'All fields are required including image' });
        }

        

        const newSnack = new Snack({
            // snackId,
            name,
            image: {
                data: imageFile.buffer,
                contentType: imageFile.mimetype
            },
            quantity,
            price
        });

        await newSnack.save();
        res.status(201).json({ message: 'Snack added successfully', snack: newSnack });
    } catch (err) {
        console.error(err);
        res.status(200).json({ message: 'Failed to add snack' });
    }
};

const editSnack = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, quantity } = req.body;
        const imageFile = req.file;

        if (!name || price == null || quantity == null) {
            return res.status(400).json({ message: 'Name, price, and quantity are required' });
        }

        const updateData = {
            name,
            price,
            quantity,
        };

        if (imageFile) {
            updateData.image = {
                data: imageFile.buffer,
                contentType: imageFile.mimetype
            };
        }

        const updated = await Snack.findOneAndUpdate(
            // { snackId: id },
            { $set: updateData },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Snack not found' });
        }

        res.status(200).json({ message: 'Snack updated successfully', snack: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update snack' });
    }
};


const deleteSnack = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Snack.findByIdAndDelete(id); // ✅ Use _id directly

        if (!deleted) {
            return res.status(404).json({ message: 'Snack not found' });
        }

        res.status(200).json({ message: 'Snack deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete snack' });
    }
};

const getAllSnacks = async (req, res) => {
    try {
        const snacks = await Snack.find().sort({ createdAt: -1 });
        res.status(200).json(snacks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch snacks' });
    }
};

const getSnackImage = async (req, res) => {
    try {
        const snack = await Snack.findById(req.params.id);
        if (!snack || !snack.image || !snack.image.data) {
            return res.status(404).send('Image not found');
        }

        res.set('Content-Type', snack.image.contentType);
        res.send(snack.image.data);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving image');
    }
};

module.exports = {
    addSnack,
    editSnack,
    deleteSnack,
    getAllSnacks,
    getSnackImage
};
