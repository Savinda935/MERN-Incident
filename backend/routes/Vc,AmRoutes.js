const express = require('express');
const router = express.Router();
const VcAm = require('../models/Vc,Am');

// Get all Vc,Am records
router.get('/', async (req, res) => {
    try {
        const records = await VcAm.find();
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});


// Create new Vc,Am record
router.post('/', async (req, res) => {
  try {
    console.log("Incoming data:", req.body);
    const record = new VcAm(req.body);
    await record.save();
    res.status(200).json({ message: 'Record added successfully' });
  } catch (error) {
    console.error("Error saving record:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update a Vc,Am record
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id; // Treat id as a string
        await VcAm.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ message: 'Record updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update record' });
    }
});   


// Delete a Vc,Am record
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id; // Treat id as a string
        await VcAm.findByIdAndDelete(id);
        res.status(200).json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

module.exports = router;