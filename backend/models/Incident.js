const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    category: { type: String, required: true },
    subValue: { type: String, required: true },
    downTimeDate: { type: String, required: true },
    upTimeDate: { type: String, required: true },
    downType: { type: String, required: true },
    escalatedPerson: { type: String, required: true },
    remarks: { type: String },
});

const Incident = mongoose.model('Incident', incidentSchema);

module.exports = Incident;
