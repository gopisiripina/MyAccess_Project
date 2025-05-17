const { db } = require('../firebase');

// Authentication middleware
exports.checkAuth = async (req, res, next) => {
  const userId = req.headers.userid;
  const userRole = req.headers.role;

  if (!userId || !userRole) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ message: 'Invalid authentication' });
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== userRole) {
      return res.status(403).json({ message: 'Invalid role' });
    }
    
    // Authentication passed
    next(); 
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};