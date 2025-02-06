const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

// get messages
router.get('/:room', async (req, res) => {
    const messages = await Message.find({ room: req.params.room }).sort({ date_sent: 1 });
    res.json(messages);
});

// save message
router.post('/send', async (req, res) => {
    const { from_user, room, message } = req.body;
    const newMessage = new Message({ from_user, room, message });

    await newMessage.save();
    res.status(201).json({ message: 'Message sent' });
});

module.exports = router;
