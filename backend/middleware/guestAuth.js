const { db } = require('../firebase');
const rateLimit = require('express-rate-limit');
const config = require('../config'); // Add this import

const guestRateLimiter = rateLimit({
  windowMs: config.guest.rateLimit.windowMs,
  max: config.guest.rateLimit.max,
  message: 'Too many requests from this guest, please try again later'
});

exports.guestAuth = async (req, res, next) => {
  const userId = req.headers.userid;
  
  if (!userId || !userId.startsWith('guest_')) {
    return res.status(401).json({ message: 'Guest authentication required' });
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || userDoc.data().role !== 'guest') {
      return res.status(401).json({ message: 'Invalid guest credentials' });
    }
    
    const userData = userDoc.data();
    if (userData.activeSessions >= config.guest.maxActiveSessions) {
      return res.status(403).json({ message: 'Maximum active sessions reached' });
    }
    
    req.guest = {
      id: userId,
      email: userData.email,
      activeSessions: userData.activeSessions || 0
    };
    next();
  } catch (error) {
    console.error('Guest auth error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

exports.guestRateLimiter = guestRateLimiter;