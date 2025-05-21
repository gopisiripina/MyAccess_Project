// server.js (updated)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const guestRoutes = require('./routes/guestRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Added admin routes
const { initializeSocket } = require('./services/socketService'); // Added socket service

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/guests', guestRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes); // Added admin routes

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT,() => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };