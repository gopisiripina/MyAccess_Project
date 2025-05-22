const { db, rtdb } = require('../firebase');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const config = require('../config');
const { processQueue, getQueuePosition } = require('../services/queueService');
const queueMonitoringService = require('../services/queueMonitoringService');


exports.guestLogin = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  try {
    const guestQuery = await db.collection('users')
      .where('email', '==', email)
      .where('role', '==', 'guest')
      .limit(1)
      .get();

    let guestRef;
    if (guestQuery.empty) {
      guestRef = db.collection('users').doc(`guest_${uuidv4()}`);
      await guestRef.set({
        email,
        role: 'guest',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        activeSessions: 0
      });
    } else {
      guestRef = db.collection('users').doc(guestQuery.docs[0].id);
      await guestRef.update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).json({ 
      userId: guestRef.id,
      role: 'guest'
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ message: 'Server error during guest login' });
  }
};

exports.requestProjectAccess = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.headers.userid;
  const email = req.headers.email;

  if (!userId || !email || !userId.startsWith('guest_')) {
    return res.status(400).json({ message: 'Valid guest credentials are required' });
  }

  try {
    const projectRef = rtdb.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const accessRef = db.collection('projectAccess').doc(projectId);
    const accessDoc = await accessRef.get();
    const accessData = accessDoc.exists ? accessDoc.data() : { isFree: true };

    const activeSession = await db.collection('guestSessions')
      .where('userId', '==', userId)
      .where('projectId', '==', projectId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!activeSession.empty) {
      const session = activeSession.docs[0].data();
      return res.status(200).json({
        accessGranted: true,
        sessionId: activeSession.docs[0].id,
        timerEnds: session.timerEnds.toDate().toISOString()
      });
    }

    if (accessData.isFree) {
      await accessRef.set({
        isFree: false,
        currentOccupant: userId,
        lastAccessed: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const sessionId = uuidv4();
      const timerEnds = new Date(Date.now() + config.guest.sessionDuration);

      await db.collection('guestSessions').doc(sessionId).set({
        userId,
        email,
        role: 'guest',
        projectId,
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        timerEnds,
        extended: false
      });

      const guestRef = db.collection('users').doc(userId);
      await guestRef.update({
        activeSessions: admin.firestore.FieldValue.increment(1)
      });

      return res.status(200).json({ 
        accessGranted: true,
        sessionId,
        timerEnds: timerEnds.toISOString()
      });
    } else {
      const position = await getQueuePosition(projectId, userId);
      if (position) {
        return res.status(200).json({ 
          accessGranted: false,
          message: 'Already in queue',
          position
        });
      }

      const queueRef = db.collection('queues').doc(projectId);
      const queueDoc = await queueRef.get();
      const currentQueue = queueDoc.exists ? queueDoc.data().queue || [] : [];

      const nowTimestamp = new Date();
      await queueRef.set({
        queue: [...currentQueue, {
          userId,
          email,
          role: 'guest',
          joinedAt: nowTimestamp,
          priority: config.guest.priority,
          requestedExtension: false
        }]
      }, { merge: true });

      const newPosition = currentQueue.length + 1;

      // 🔁 Get remaining time of current occupant
      let currentSessionRemainingTime = 0;
      if (!accessData.isFree && accessData.currentOccupant) {
        const occupantSession = await db.collection('guestSessions')
          .where('userId', '==', accessData.currentOccupant)
          .where('projectId', '==', projectId)
          .where('status', '==', 'active')
          .limit(1)
          .get();

        if (!occupantSession.empty) {
          const occupantData = occupantSession.docs[0].data();
          const endTime = occupantData.timerEnds.toDate();
          const now = new Date();
          currentSessionRemainingTime = Math.max(0, endTime - now);
        }
      }

      return res.status(200).json({ 
        accessGranted: false,
        message: 'Added to queue',
        position: newPosition,
        estimatedWait: currentSessionRemainingTime + (newPosition - 1) * config.guest.sessionDuration,
        remainingTimeOfCurrentUser: currentSessionRemainingTime
      });
    }
  } catch (error) {
    console.error('Access request error:', error);
    res.status(500).json({ message: 'Server error during access request' });
  }
};

exports.endSession = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.headers.userid;

  try {
    const sessionRef = db.collection('guestSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const session = sessionDoc.data();
    if (session.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to end this session' });
    }

    await sessionRef.update({
      status: 'completed',
      endTime: admin.firestore.FieldValue.serverTimestamp()
    });

    const accessRef = db.collection('projectAccess').doc(session.projectId);
    await accessRef.update({
      isFree: true,
      currentOccupant: null
    });

    const guestRef = db.collection('users').doc(userId);
    await guestRef.update({
      activeSessions: admin.firestore.FieldValue.increment(-1)
    });

    const nextUser = await processQueue(session.projectId);

    res.status(200).json({ 
      message: 'Session ended successfully',
      nextUser: nextUser || null
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error while ending session' });
  }
};

exports.requestTimeExtension = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.headers.userid;

  try {
    const sessionRef = db.collection('guestSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const session = sessionDoc.data();
    if (session.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to extend this session' });
    }

    if (session.extended) {
      return res.status(400).json({ message: 'Session already extended' });
    }

    await db.collection('extensionRequests').add({
      sessionId,
      userId,
      email: session.email,
      projectId: session.projectId,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      currentTimerEnds: session.timerEnds,
      requestedExtension: config.guest.sessionExtensionDuration
    });

    res.status(200).json({ 
      message: 'Extension request submitted',
      currentTimerEnds: session.timerEnds.toDate().toISOString()
    });
  } catch (error) {
    console.error('Extension request error:', error);
    res.status(500).json({ message: 'Server error while requesting extension' });
  }
};
// Get current queue status for a user
exports.getQueueStatus = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.headers.userid;

  if (!userId || !userId.startsWith('guest_')) {
    return res.status(400).json({ message: 'Valid guest credentials are required' });
  }

  try {
    const queueStatus = await queueMonitoringService.getQueueStatus(projectId, userId);
    
    // Also check if user has active session
    const activeSession = await db.collection('guestSessions')
      .where('userId', '==', userId)
      .where('projectId', '==', projectId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!activeSession.empty) {
      const session = activeSession.docs[0].data();
      const now = new Date();
      const timerEnds = session.timerEnds.toDate();
      const remainingTime = Math.max(0, timerEnds.getTime() - now.getTime());
      
      return res.status(200).json({
        hasActiveSession: true,
        sessionId: activeSession.docs[0].id,
        remainingTime: remainingTime,
        remainingTimeFormatted: Math.ceil(remainingTime / 1000) + 's',
        ...queueStatus
      });
    }

    res.status(200).json({
      hasActiveSession: false,
      ...queueStatus
    });
    
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ message: 'Server error while checking queue status' });
  }
};

// Get queue details for a project (for admins)
exports.getProjectQueueDetails = async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const queueDetails = await queueMonitoringService.getQueueDetails(projectId);
    
    res.status(200).json({
      projectId,
      queueLength: queueDetails.length,
      queue: queueDetails
    });
    
  } catch (error) {
    console.error('Project queue details error:', error);
    res.status(500).json({ message: 'Server error while fetching queue details' });
  }
};
