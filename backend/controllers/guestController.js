const { db, rtdb } = require('../firebase');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const config = require('../config');
const { processQueue, getQueuePosition } = require('../services/queueService');

exports.guestLogin = async (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  try {
    // Check if guest already exists
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
    // Verify project exists
    const projectRef = rtdb.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check current access state
    const accessRef = db.collection('projectAccess').doc(projectId);
    const accessDoc = await accessRef.get();
    const accessData = accessDoc.exists ? accessDoc.data() : { isFree: true };

    // Check if user already has active session
    const activeSession = await db.collection('guestSessions')
      .where('userId', '==', userId)
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
      // Grant access
      await accessRef.set({
        isFree: false,
        currentOccupant: userId,
        lastAccessed: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Create session
      const sessionId = uuidv4();
      const timerEnds = new Date(Date.now() + config.guest.sessionDuration);
      
      await db.collection('guestSessions').doc(sessionId).set({
        userId,
        email,
        projectId,
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        timerEnds,
        extended: false
      });

      // Update guest's active sessions count
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
      // Add to queue
      const position = await getQueuePosition(projectId, userId);
      if (position) {
        return res.status(200).json({ 
          accessGranted: false,
          message: 'Already in queue',
          position
        });
      }

      // Fix for the serverTimestamp in array issue
      const queueRef = db.collection('queues').doc(projectId);
      const queueDoc = await queueRef.get();
      const currentQueue = queueDoc.exists ? queueDoc.data().queue || [] : [];
      
      // Use a regular timestamp (current date) instead of serverTimestamp for array elements
      const nowTimestamp = new Date();
      
      await queueRef.set({
        queue: [...currentQueue, {
          userId,
          email,
          joinedAt: nowTimestamp, // Use a regular Date object instead of serverTimestamp
          priority: config.guest.priority,
          requestedExtension: false
        }]
      }, { merge: true });

      return res.status(200).json({ 
        accessGranted: false,
        message: 'Added to queue',
        position: currentQueue.length + 1,
        estimatedWait: currentQueue.length * config.guest.sessionDuration
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

    // Update session
    await sessionRef.update({
      status: 'completed',
      endTime: admin.firestore.FieldValue.serverTimestamp()
    });

    // Free up the project
    const accessRef = db.collection('projectAccess').doc(session.projectId);
    await accessRef.update({
      isFree: true,
      currentOccupant: null
    });

    // Update guest's active sessions count
    const guestRef = db.collection('users').doc(userId);
    await guestRef.update({
      activeSessions: admin.firestore.FieldValue.increment(-1)
    });

    // Process next in queue
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

    // Create extension request
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