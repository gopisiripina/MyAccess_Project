// services/socketService.js
const socketIo = require('socket.io');
const { db, rtdb } = require('../firebase');
const { checkExpiredSessions } = require('./sessionMonitor');

let io;

exports.initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Client connection
  io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Guest joins a project queue room
    socket.on('joinQueueRoom', (projectId) => {
      socket.join(`queue-${projectId}`);
    });
    
    // Guest joins a session room
    socket.on('joinSessionRoom', (sessionId) => {
      socket.join(`session-${sessionId}`);
    });
    
    // Guest leaves a project queue room
    socket.on('leaveQueueRoom', (projectId) => {
      socket.leave(`queue-${projectId}`);
    });
    
    // Admin joins admin room
    socket.on('joinAdminRoom', (role) => {
      if (role === 'admin' || role === 'superadmin') {
        socket.join('admin-room');
      }
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
  
  // Set up listeners for Firestore and RTDB changes
  setupFirestoreListeners();
  setupRtdbListeners();
  
  // Set up timer for checking expired sessions
  setInterval(async () => {
    const result = await checkExpiredSessions();
    if (result.expired > 0) {
      io.to('admin-room').emit('sessionsExpired', result);
      
      // Notify each project room about freed access
      for (const projectId of new Set(result.sessions.map(s => s.projectId))) {
        io.to(`queue-${projectId}`).emit('projectAccessFreed', { projectId });
      }
    }
  }, 5000); // Check every 5 seconds
  
  return io;
};

function setupFirestoreListeners() {
  // Listen for queue changes
  db.collection('queues').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'modified') {
        const queueData = change.doc.data();
        const projectId = change.doc.id;
        
        // Emit to project queue room
        io.to(`queue-${projectId}`).emit('queueUpdated', {
          projectId,
          queueLength: queueData.queue ? queueData.queue.length : 0,
          queue: queueData.queue || []
        });
        
        // Also emit to admin room
        io.to('admin-room').emit('queueUpdated', {
          projectId,
          queueLength: queueData.queue ? queueData.queue.length : 0,
          queue: queueData.queue || []
        });
      }
    });
  });
  
  // Listen for session changes
  db.collection('guestSessions').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      const sessionData = change.doc.data();
      const sessionId = change.doc.id;
      
      // Emit to session room
      io.to(`session-${sessionId}`).emit('sessionUpdated', {
        sessionId,
        status: sessionData.status,
        timerEnds: sessionData.timerEnds ? sessionData.timerEnds.toDate().toISOString() : null
      });
      
      // Emit to admin room
      io.to('admin-room').emit('sessionUpdated', {
        sessionId,
        userId: sessionData.userId,
        email: sessionData.email,
        projectId: sessionData.projectId,
        status: sessionData.status,
        timerEnds: sessionData.timerEnds ? sessionData.timerEnds.toDate().toISOString() : null
      });
      
      // For new sessions, emit to project queue room
      if (change.type === 'added' && sessionData.status === 'active') {
        io.to(`queue-${sessionData.projectId}`).emit('newSessionStarted', {
          projectId: sessionData.projectId,
          userId: sessionData.userId
        });
      }
      
      // For ended sessions, emit to project queue room
      if (change.type === 'modified' && 
          (sessionData.status === 'completed' || 
           sessionData.status === 'expired' || 
           sessionData.status === 'terminated')) {
        io.to(`queue-${sessionData.projectId}`).emit('sessionEnded', {
          projectId: sessionData.projectId,
          userId: sessionData.userId
        });
      }
    });
  });
  
  // Listen for access changes
  db.collection('projectAccess').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      const accessData = change.doc.data();
      const projectId = change.doc.id;
      
      // Emit to project queue room
      io.to(`queue-${projectId}`).emit('accessStateChanged', {
        projectId,
        isFree: accessData.isFree,
        currentOccupant: accessData.currentOccupant
      });
      
      // Also emit to admin room
      io.to('admin-room').emit('accessStateChanged', {
        projectId,
        isFree: accessData.isFree,
        currentOccupant: accessData.currentOccupant,
        lastAccessed: accessData.lastAccessed ? accessData.lastAccessed.toDate().toISOString() : null
      });
    });
  });
}

function setupRtdbListeners() {
  // Listen for project setting changes
  const projectsRef = rtdb.ref('projects');
  
  projectsRef.on('child_changed', snapshot => {
    const projectData = snapshot.val();
    const projectId = snapshot.key;
    
    // Check if maintenance mode changed
    if (projectData.maintenanceMode !== undefined) {
      io.to(`queue-${projectId}`).emit('maintenanceModeChanged', {
        projectId,
        maintenanceMode: projectData.maintenanceMode
      });
      
      io.to('admin-room').emit('maintenanceModeChanged', {
        projectId,
        maintenanceMode: projectData.maintenanceMode
      });
    }
  });
}

// Helper functions for other parts of the application to emit events
exports.emitQueuePositionUpdate = (projectId, queue) => {
  if (!io) return;
  
  io.to(`queue-${projectId}`).emit('queuePositionsUpdated', {
    projectId,
    queue: queue.map((user, index) => ({
      userId: user.userId,
      position: index + 1
    }))
  });
};

exports.emitSessionTimerUpdate = (sessionId, timeRemaining) => {
  if (!io) return;
  
  io.to(`session-${sessionId}`).emit('sessionTimerUpdate', {
    sessionId,
    timeRemaining
  });
};

exports.emitAccessGranted = (projectId, userId, sessionId) => {
  if (!io) return;
  
  io.to(`queue-${projectId}`).emit('accessGranted', {
    projectId,
    userId,
    sessionId
  });
};

exports.getSocketIo = () => io;