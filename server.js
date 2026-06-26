const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        // Allows frontend (e.g., your local HTML file) to connect.
        // Replace '*' with your actual frontend domain when deploying.
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Port configuration
const PORT = process.env.PORT || 3000;

// --- 1. Middleware ---
// Allows the server to parse incoming JSON data (e.g., from your donation forms)
app.use(express.json()); 

// Optional: Serve static files from a 'public' folder (if you want to serve your HTML from here)
// app.use(express.static('public')); 

// --- 2. In-Memory Data Store (Temporary) ---
// In a real application, this would be a database (MongoDB, PostgreSQL, etc.)
let analyticsData = {
    mealsShared: 124567,
    volunteers: 3842,
    partners: 217,
    foodSavedT: 28.5
};

let liveDonations = [
    { id: 1, item: "Vegetable Biryani", city: "Mumbai", expiry: 12 },
    { id: 2, item: "Paneer Butter Masala", city: "Delhi NCR", expiry: 4 },
    // Add more initial data as needed
];

let chatMessages = [
    { sender: "Ramesh (Volunteer)", text: "Picking up 50 meals from ITC Chennai at 3PM", type: "other" },
    { sender: "Priya (Donor)", text: "We have 20 veg thalis available at Green Bites, Koramangala", type: "other" }
];


// --- 3. API Routes (REST Endpoints) ---

// Route to get Analytics Dashboard data
app.get('/api/analytics', (req, res) => {
    console.log('GET /api/analytics requested');
    res.json(analyticsData);
});

// Route to handle a new Food Donation
app.post('/api/donations', (req, res) => {
    const newDonation = {
        id: liveDonations.length + 1,
        ...req.body, // Expects { item, quantity, city, location }
        status: 'Available',
        timestamp: new Date().toISOString()
    };
    liveDonations.push(newDonation);
    console.log('New Donation Registered:', newDonation);
    
    // Notify all clients about the new donation via Socket.IO
    io.emit('donationUpdate', newDonation); 
    
    res.status(201).json({ message: 'Donation registered successfully', data: newDonation });
});

// --- 4. Real-time Communication (Socket.IO) ---

io.on('connection', (socket) => {
    console.log('A user connected with ID:', socket.id);

    // Send the existing chat history to the new user upon connection
    socket.emit('chatHistory', chatMessages);
    
    // Handle incoming chat messages
    socket.on('sendMessage', (msg) => {
        console.log('New chat message:', msg);
        
        // Add message to in-memory store
        const chatMsg = { 
            sender: msg.sender || "Anonymous", 
            text: msg.text,
            timestamp: new Date().toLocaleTimeString()
        };
        chatMessages.push(chatMsg);

        // Broadcast the message to all connected clients
        io.emit('newMessage', chatMsg);
    });

    // Handle donation pickup status change (for map/expiry tracker)
    socket.on('updateDonationStatus', (data) => {
        // In a real app, you'd find and update the item in the database here.
        console.log(`Donation ${data.id} status updated to: ${data.status}`);
        
        // Broadcast the update to all clients
        io.emit('donationStatusChanged', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});


// --- 5. Start the Server ---
server.listen(PORT, () => {
    console.log(`Annadaata Backend Server running on port ${PORT}`);
    console.log(`Access API at: http://localhost:${PORT}/api/analytics`);
});