const Snack = require('../models/snacks.models'); // adjust path as needed

const addSnack = async (req, res) => {
    try {
        const { name, quantity, price } = req.body;
        const imageFile = req.file;

        if (!name || !imageFile || quantity == null || price == null) {
            return res.status(400).json({ message: 'All fields are required including image' });
        }



        const newSnack = new Snack({
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
const consumeSnackQuantity = async (req, res) => {
    try {
        const { snackId } = req.params;
        const { usedQuantity } = req.body;

        if (typeof usedQuantity !== 'number' || usedQuantity <= 0) {
            return res.status(400).json({ message: 'usedQuantity must be a positive number' });
        }

        const snack = await Snack.findById(snackId);

        if (!snack) {
            return res.status(404).json({ message: 'Snack not found' });
        }

        if (usedQuantity > snack.quantity) {
            return res.status(400).json({
                message: `Not enough quantity. Current: ${snack.quantity}, Requested: ${usedQuantity}`
            });
        }

        snack.quantity -= usedQuantity;
        await snack.save();

        res.status(200).json({
            message: 'Snack quantity updated successfully',
            remainingQuantity: snack.quantity,
            snack
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update snack quantity' });
    }
};

const editSnackQuantity = async (req, res) => {
    try {
        const { id } = req.params; // MongoDB ObjectId
        const { increase } = req.body; // true or false

        if (typeof increase !== 'boolean') {
            return res.status(400).json({ message: 'Boolean "increase" value is required' });
        }

        const snack = await Snack.findById(id);
        if (!snack) {
            return res.status(404).json({ message: 'Snack not found' });
        }

        snack.quantity = increase ? snack.quantity + 1 : Math.max(snack.quantity - 1, 0);
        await snack.save();

        res.status(200).json({ message: 'Quantity updated', snack });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update quantity' });
    }
};

const editSnack = async (req, res) => {
    try {
        const { id } = req.params; // This should be the MongoDB _id
        const { name, price, quantity } = req.body;
        const imageFile = req.file;

        // Basic validation
        if (!name || price == null || quantity == null) {
            return res.status(400).json({ message: 'Name, price, and quantity are required' });
        }

        // Build the update object
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

        // Perform update
        const updated = await Snack.findByIdAndUpdate(
            id,                    // Use _id here
            { $set: updateData },
            { new: true }          // Return the updated document
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
    getSnackImage,
    editSnackQuantity,
    consumeSnackQuantity
};
