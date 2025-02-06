const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    firstname: String,
    lastname: String,
    password: String,
    createdOn: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
