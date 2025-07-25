const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');

// Get all incidents
router.get('/', async (req, res) => {
    try {
        const incidents = await Incident.find();
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Create new incident
router.post('/', async (req, res) => {
    try {
        const incident = new Incident({ ...req.body, id: Date.now() });
        await incident.save();
        res.status(200).json({ message: 'Incident added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save incident' });
    }
});

// Update an incident
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await Incident.findOneAndUpdate({ id }, req.body);
        res.status(200).json({ message: 'Incident updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update incident' });
    }
});

// Delete an incident
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await Incident.findOneAndDelete({ id });
        res.status(200).json({ message: 'Incident deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete incident' });
    }
});

module.exports = router;
