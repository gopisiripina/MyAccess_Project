// controllers/adminController.js
const { db } = require('../firebase');
const admin = require('firebase-admin');
const { processQueue } = require('../services/queueService');
const config = require('../config');

// Get all active guest sessions
exports.getActiveSessions = async (req, res) => {
  const userRole = req.headers.role;
  
  // Only admin and superadmin can view all sessions
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const sessionsQuery = await db.collection('guestSessions')
      .where('status', '==', 'active')
      .get();
    
    const sessions = [];
    sessionsQuery.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
        timerEnds: doc.data().timerEnds.toDate().toISOString()
      });
    });
    
    res.status(200).json(sessions);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get queue for all projects
exports.getAllQueues = async (req, res) => {
  const userRole = req.headers.role;
  
  // Only admin and superadmin can view all queues
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const queuesQuery = await db.collection('queues').get();
    
    const queues = {};
    queuesQuery.forEach(doc => {
      const queue = doc.data().queue || [];
      
      queues[doc.id] = queue.map(user => ({
        userId: user.userId,
        email: user.email,
        joinedAt: user.joinedAt.toDate().toISOString(),
        priority: user.priority,
        requestedExtension: user.requestedExtension || false
      }));
    });
    
    res.status(200).json(queues);
  } catch (error) {
    console.error('Error fetching queues:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handle extension requests
exports.getExtensionRequests = async (req, res) => {
  const userRole = req.headers.role;
  
  // Only admin and superadmin can view extension requests
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const requestsQuery = await db.collection('extensionRequests')
      .where('status', '==', 'pending')
      .get();
    
    const requests = [];
    requestsQuery.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt.toDate().toISOString(),
        currentTimerEnds: doc.data().currentTimerEnds.toDate().toISOString()
      });
    });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching extension requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve extension request
exports.approveExtension = async (req, res) => {
  const { requestId } = req.params;
  const userRole = req.headers.role;
  
  // Only admin and superadmin can approve extensions
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const requestRef = db.collection('extensionRequests').doc(requestId);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    const request = requestDoc.data();
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }
    
    // Get session
    const sessionRef = db.collection('guestSessions').doc(request.sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists || sessionDoc.data().status !== 'active') {
      await requestRef.update({
        status: 'rejected',
        processedBy: req.headers.userid,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        reason: 'Session no longer active'
      });
      
      return res.status(400).json({ message: 'Session is no longer active' });
    }
    
    // Update session timer
    const newTimerEnds = new Date(Date.now() + request.requestedExtension);
    await sessionRef.update({
      timerEnds: newTimerEnds,
      extended: true
    });
    
    // Update request status
    await requestRef.update({
      status: 'approved',
      processedBy: req.headers.userid,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      newTimerEnds: newTimerEnds
    });
    
    res.status(200).json({ 
      message: 'Extension approved',
      sessionId: request.sessionId,
      newTimerEnds: newTimerEnds.toISOString()
    });
  } catch (error) {
    console.error('Error approving extension:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject extension request
exports.rejectExtension = async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;
  const userRole = req.headers.role;
  
  // Only admin and superadmin can reject extensions
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const requestRef = db.collection('extensionRequests').doc(requestId);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    const request = requestDoc.data();
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }
    
    // Update request status
    await requestRef.update({
      status: 'rejected',
      processedBy: req.headers.userid,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: reason || 'No reason provided'
    });
    
    res.status(200).json({ 
      message: 'Extension rejected',
      sessionId: request.sessionId
    });
  } catch (error) {
    console.error('Error rejecting extension:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get usage logs
exports.getUsageLogs = async (req, res) => {
  const userRole = req.headers.role;
  
  // Only superadmin can view all logs
  if (userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const logsQuery = await db.collection('guestSessions')
      .orderBy('startTime', 'desc')
      .limit(100) // Limit to recent 100 logs
      .get();
    
    const logs = [];
    logsQuery.forEach(doc => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        userId: data.userId,
        email: data.email,
        projectId: data.projectId,
        status: data.status,
        startTime: data.startTime.toDate().toISOString(),
        endTime: data.endTime ? data.endTime.toDate().toISOString() : null,
        duration: data.endTime ? (data.endTime.toDate() - data.startTime.toDate()) / 1000 : null, // in seconds
        extended: data.extended || false
      });
    });
    
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching usage logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// End guest session (admin override)
exports.endGuestSession = async (req, res) => {
  const { sessionId } = req.params;
  const userRole = req.headers.role;
  
  // Only admin and superadmin can forcefully end sessions
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const sessionRef = db.collection('guestSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const session = sessionDoc.data();
    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Session is not active' });
    }
    
    // Update session
    await sessionRef.update({
      status: 'terminated',
      endTime: admin.firestore.FieldValue.serverTimestamp(),
      terminatedBy: req.headers.userid
    });
    
    // Free up the project
    const accessRef = db.collection('projectAccess').doc(session.projectId);
    await accessRef.update({
      isFree: true,
      currentOccupant: null
    });
    
    // Update guest's active sessions count
    const guestRef = db.collection('users').doc(session.userId);
    await guestRef.update({
      activeSessions: admin.firestore.FieldValue.increment(-1)
    });
    
    // Process next in queue
    const nextUser = await processQueue(session.projectId);
    
    res.status(200).json({ 
      message: 'Session terminated successfully',
      nextUser: nextUser || null
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
};