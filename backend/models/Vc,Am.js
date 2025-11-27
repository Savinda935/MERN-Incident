const mongoose = require('mongoose');

const vcAmSchema = new mongoose.Schema({
    Date: { type: String, required: true },
    host: { type: String, required: true },
    status : { type: String, required: true },
    remarks: { type: String },
});

const VcAm = mongoose.model('VcAm', vcAmSchema);
module.exports = VcAm;