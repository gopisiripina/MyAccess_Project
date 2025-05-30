// services/queueService.js
const admin = require('firebase-admin');
const { db } = require('../firebase');
const config = require('../config');

// Get queue position for a user
exports.getQueuePosition = async (projectId, userId) => {
  try {
    const queueRef = db.collection('queues').doc(projectId);
    const queueDoc = await queueRef.get();
    
    if (!queueDoc.exists) {
      return null;
    }
    
    const queue = queueDoc.data().queue || [];
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].userId === userId) {
        return i + 1; // Return 1-based position
      }
    }
    
    return null; // User not in queue
  } catch (error) {
    console.error('Error getting queue position:', error);
    return null;
  }
};

// Sort queue based on priority
const sortQueueByPriority = (queue) => {
  return [...queue].sort((a, b) => {
    // First sort by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    
    // If same priority, sort by join time (first come first served)
    return a.joinedAt.toMillis() - b.joinedAt.toMillis();
  });
};

// Process next user in queue
// Fix for the processQueue function in queueService.js
exports.processQueue = async (projectId) => {
  try {
    const queueRef = db.collection('queues').doc(projectId);
    const queueDoc = await queueRef.get();
    
    if (!queueDoc.exists || !queueDoc.data().queue || queueDoc.data().queue.length === 0) {
      return null;
    }
    
    // Sort the queue by priority
    const queue = queueDoc.data().queue;
    const sortedQueue = sortQueueByPriority(queue);
    const nextUser = sortedQueue[0];

    // Update the stored queue to reflect the new sorted order
    if (JSON.stringify(queue) !== JSON.stringify(sortedQueue)) {
      await queueRef.update({ queue: sortedQueue });
    }
    
    // If there's a next user, grant them access
    if (nextUser) {
      // Update access record
      const accessRef = db.collection('projectAccess').doc(projectId);
      await accessRef.set({
        isFree: false,
        currentOccupant: nextUser.userId,
        lastAccessed: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Create session for next user
      const sessionId = require('uuid').v4();
      
      // THIS IS THE KEY FIX: Always check role explicitly rather than relying on role property
      // which might not always be present in older queue entries
      let sessionDuration;
      
      if (nextUser.role === 'guest') {
        sessionDuration = config.guest.sessionDuration; // 60000 milliseconds (60 seconds)
      } else if (nextUser.role === 'admin' || nextUser.role === 'superadmin' || nextUser.role === 'user') {
        sessionDuration = config.regular.sessionDuration; // 300000 milliseconds (5 minutes)
      } else {
        // For safety, if role is undefined or doesn't match known roles,
        // check userId pattern as fallback
        sessionDuration = nextUser.userId.startsWith('guest_') ? 
          config.guest.sessionDuration : 
          config.regular.sessionDuration;
      }
      
      const timerEnds = new Date(Date.now() + sessionDuration);
      
      await db.collection('guestSessions').doc(sessionId).set({
        userId: nextUser.userId,
        email: nextUser.email,
        role: nextUser.role, // Make sure to store the role
        projectId,
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        timerEnds,
        extended: false
      });
      
      // Update user's active sessions count
      const userRef = db.collection('users').doc(nextUser.userId);
      await userRef.update({
        activeSessions: admin.firestore.FieldValue.increment(1)
      });
      
      // Remove the user from the queue
      await queueRef.update({
        queue: admin.firestore.FieldValue.arrayRemove(nextUser)
      });
      
      return {
        userId: nextUser.userId,
        email: nextUser.email,
        sessionId,
        role: nextUser.role,
        timerEnds: timerEnds.toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error processing queue:', error);
    return null;
  }
};