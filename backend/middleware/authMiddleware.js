// middleware/authMiddleware.js
const admin = require('firebase-admin');
const { db } = require('../firebase');

// Simple auth middleware without JWT
exports.verifyUser = async (req, res, next) => {
  const userId = req.headers.userid;
  const email = req.headers.email;
  
  if (!userId || !email) {
    return res.status(401).json({ message: 'User ID and email required' });
  }
  
  try {
    // Get user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Verify email matches
    if (userData.email !== email) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Add user data to request
    req.user = {
      uid: userId,
      email: userData.email,
      role: userData.role
    };
    
    // Add headers for downstream middleware
    req.headers.role = userData.role;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Check role middleware (unchanged)
exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied - Insufficient permissions' });
    }
    
    next();
  };
};