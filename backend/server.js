// server.js - Backend for Chat App
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const connectDB = require('./config/db');
const GroupMessage = require('./models/GroupMessage');
const PrivateMessage = require('./models/PrivateMessage');
const User = require("./models/User");

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Get all users for private chat
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({}, "username");
        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: "Failed to fetch users." });
    }
});

// Get Group chat history
app.get("/api/chat/history", async (req, res) => {
    try {
        const { room } = req.query;
        const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
        res.json(messages);
    } catch (err) {
        console.error("Error fetching chat history:", err);
        res.status(500).json({ message: "Failed to fetch chat history." });
    }
});

// Get private chat history between two users
app.get('/api/private-messages/:from/:to', async (req, res) => {
    try {
        const { from, to } = req.params;
        
        const messages = await PrivateMessage.find({
            $or: [
                { from_user: from, to_user: to },
                { from_user: to, to_user: from }
            ]
        }).sort({ date_sent: 1 });

        res.json(messages);
    } catch (err) {
        console.error('Error fetching private messages:', err);
        res.status(500).json({ message: 'Failed to retrieve chat history.' });
    }
});

// Socket.io for real-time chat
const users = {}; // { username: socketId }
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    
    socket.on('joinRoom', async ({ username, room }) => {
        socket.join(room);
        users[username] = socket.id;

        try {
            const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
            socket.emit("loadHistory", messages);
        } catch (err) {
            console.error("Error loading chat history:", err);
        }

        
        io.to(room).emit('message', { from_user: 'System', message: `${username} has joined the room.` });
    });

    
    socket.on('sendMessage', async ({ message, room, username }) => {
        try {
            const newMessage = new GroupMessage({
                from_user: username,
                room,
                message,
                date_sent: new Date()
            });
            await newMessage.save(); 

           
            io.to(room).emit('message', { from_user: username, message });
        } catch (err) {
            console.error('Message save error:', err);
        }
    });

    
    socket.on('privateMessage', async ({ message, from_user, to_user }) => {
        try {
            const newPrivateMessage = new PrivateMessage({
                from_user,
                to_user,
                message,
                date_sent: new Date()
            });
            await newPrivateMessage.save(); 

            const recipientSocket = users[to_user];

            if (recipientSocket) {
                io.to(recipientSocket).emit('receivePrivateMessage', { from_user, message });
            }

            socket.emit('receivePrivateMessage', { from_user: 'You', message });

        } catch (err) {
            console.error('Private message save error:', err);
        }
    });

    
    socket.on('typing', ({ username, room }) => {
        socket.broadcast.to(room).emit('displayTyping', { username });
    });

   
    let typingTimeouts = {};

    socket.on('typingIndicator', ({ from_user, to_user }) => {
        const recipientSocketId = users[to_user];

        if (recipientSocketId) {
            io.to(recipientSocketId).emit('typingIndicator', { from_user });

            
            if (typingTimeouts[from_user]) {
                clearTimeout(typingTimeouts[from_user]);
            }
            typingTimeouts[from_user] = setTimeout(() => {
                io.to(recipientSocketId).emit('typingIndicator', { from_user: "" });
            }, 2000);
        }
    });

    
    socket.on('leaveRoom', () => {
        const user = Object.keys(users).find(key => users[key] === socket.id);
        if (user) {
            io.emit('message', { from_user: 'System', message: `${user} has left the room.` });
            delete users[user];
        }
    });

    
    socket.on('disconnect', () => {
        const user = Object.keys(users).find(key => users[key] === socket.id);
        if (user) {
            io.emit('message', { from_user: 'System', message: `${user} has disconnected.` });
            delete users[user];
        }
        console.log('A user disconnected:', socket.id);
    });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
