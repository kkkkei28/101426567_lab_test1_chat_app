const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
    from_user: { type: String, required: true },
    to_user: { type: String, required: true },
    message: { type: String, required: true },
    date_sent: { type: Date, default: Date.now }
}, { timestamps: true });

privateMessageSchema.index({ from_user: 1, to_user: 1, date_sent: 1 });

const PrivateMessage = mongoose.model('PrivateMessage', privateMessageSchema);
module.exports = PrivateMessage;
