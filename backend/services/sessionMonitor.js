// services/sessionMonitor.js
const { db } = require('../firebase');
const admin = require('firebase-admin');
const { endSession } = require('../controllers/guestController');

// This function will be called periodically to check for expired sessions
exports.checkExpiredSessions = async () => {
  try {
    const now = admin.firestore.Timestamp.now();

    // Find expired sessions
    const expiredSessionsQuery = await db.collection('guestSessions')
      .where('status', '==', 'active')
      .where('timerEnds', '<=', now)
      .get();

    if (expiredSessionsQuery.empty) {
      return { expired: 0 };
    }

    const expiredSessions = [];
    expiredSessionsQuery.forEach(doc => {
      expiredSessions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const batch = db.batch();
    const projectsToFree = new Set();

    for (const session of expiredSessions) {
      const sessionRef = db.collection('guestSessions').doc(session.id);
      batch.update(sessionRef, {
        status: 'expired',
        endTime: admin.firestore.Timestamp.now()
      });

      // Check if projectId is valid
      if (session.projectId && typeof session.projectId === 'string') {
        projectsToFree.add(session.projectId);
      } else {
        console.warn(`Invalid or missing projectId for session ${session.id}`);
      }

      // Check if userId is valid before updating user record
      if (session.userId && typeof session.userId === 'string') {
        const userRef = db.collection('users').doc(session.userId);
        batch.update(userRef, {
          activeSessions: admin.firestore.FieldValue.increment(-1)
        });
      } else {
        console.warn(`Invalid or missing userId for session ${session.id}`);
      }
    }

    await batch.commit();

    // Process queue and free up projects
    const { processQueue } = require('./queueService');
    for (const projectId of projectsToFree) {
      if (projectId && typeof projectId === 'string') {
        await db.collection('projectAccess').doc(projectId).update({
          isFree: true,
          currentOccupant: null
        });

        // Process next guest in queue for this project
        await processQueue(projectId);
      } else {
        console.warn(`Skipping invalid projectId: ${projectId}`);
      }
    }

    return {
      expired: expiredSessions.length,
      sessions: expiredSessions.map(s => s.id)
    };

  } catch (error) {
    console.error('Error checking expired sessions:', error);
    return { error: error.message };
  }
};

// This function will handle WebSocket notifications for expiring sessions
exports.notifyExpiringSession = async (sessionId, timeRemaining) => {
  // In production, implement this using socket.io or similar WebSocket system
  console.log(`Session ${sessionId} expires in ${timeRemaining}ms`);
};

