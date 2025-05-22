//controllers/projectController.js
const { rtdb, db } = require('../firebase'); // Import both
const admin = require('firebase-admin'); // Add this import
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { processQueue, getQueuePosition } = require('../services/queueService');

// Get all projects user has access to
exports.getProjects = async (req, res) => {
  const userId = req.headers.userid;
  const userRole = req.headers.role;

  try {
    const projectsRef = rtdb.ref('projects');
    const snapshot = await projectsRef.once('value');
    const allProjects = snapshot.val();
    
    if (!allProjects) {
      return res.status(200).json([]); // Return empty array if no projects exist
    }
    
    const accessibleProjects = [];
    
    for (const projectId in allProjects) {
      const project = allProjects[projectId];
      
      // Check access (either by role or specific user access)
      if (project.access && (project.access[userRole] || project.access[userId])) {
        accessibleProjects.push({
          id: projectId,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt || null
        });
      }
    }
    
    res.status(200).json(accessibleProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single project by ID
exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  const userId = req.headers.userid;
  const userRole = req.headers.role;

  try {
    const projectRef = rtdb.ref(`projects/${id}`);
    const snapshot = await projectRef.once('value');
    const project = snapshot.val();
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check access
    if (!project.access || (!project.access[userRole] && !project.access[userId])) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json({
      id,
      ...project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get project dashboard data
// Update the getProjectDashboard function to handle guests
exports.getProjectDashboard = async (req, res) => {
  const { projectId } = req.params;
  const { userid, role } = req.headers;

  try {
    const projectRef = rtdb.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    const projectData = snapshot.val();

    if (!projectData) {
      return res.status(404).json({ message: 'Project not found' });
    }
    // For superadmin, admin, and regular users with direct access
    if (role === 'guest'|| role === 'admin' || role === 'superadmin'|| role === 'user') { 
      // Check if user has access through role or specific user access
      if (projectData.access && (projectData.access[role] || projectData.access[userid])) {
        // Return full project data for authorized users
        return res.status(200).json(projectData);
      }
      return res.status(403).json({ message: "Access denied" });
    }

    // Guest-specific access flow
    // Check for active session first
    const activeSessionRef = db.collection('guestSessions')
      .where('projectId', '==', projectId)
      .where('userId', '==', userid)
      .where('status', '==', 'active')
      .limit(1);
    
    const activeSnapshot = await activeSessionRef.get();
    
    if (!activeSnapshot.empty) {
      // User has an active session, return limited data for guests
      const filteredData = {
        name: projectData.name,
        description: projectData.description,
        access: {
          role: 'guest',
          sessionActive: true
        },
        // Include only basic vehicle info for guests
        vehicles: Object.entries(projectData.vehicles || {}).reduce((acc, [key, value]) => {
          acc[key] = {
            location: value.location,
            speed: value.speed
          };
          return acc;
        }, {})
      };
      return res.status(200).json(filteredData);
    }

    // If no active session, check if they're in the queue
    const queueRef = db.collection('queues').doc(projectId);
    const queueDoc = await queueRef.get();
    
    if (queueDoc.exists) {
      const queue = queueDoc.data().queue || [];
      const userInQueue = queue.find(user => user.userId === userid);
      
      if (userInQueue) {
        return res.status(200).json({
          name: projectData.name,
          description: projectData.description,
          accessInfo: {
            inQueue: true,
            position: queue.findIndex(user => user.userId === userid) + 1,
            estimatedWait: queue.length * 60000 // 1 minute per user in queue
          }
        });
      }
    }

    // No access granted
    return res.status(403).json({ 
      message: "Access denied. No active session or queue position found.",
      suggestion: "Request access to join the queue"
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: "Server error" });
  }
};
// Add new project (admin/superadmin only)
exports.addProject = async (req, res) => {
  const { name, description } = req.body;
  const userId = req.headers.userid;
  const userRole = req.headers.role;

  if (!name || !description) {
    return res.status(400).json({ message: 'Name and description are required' });
  }

  if (userRole !== 'superadmin' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can add projects' });
  }

  try {
    const projectsRef = rtdb.ref('projects');
    const newProjectRef = projectsRef.push();
    
    const projectData = {
      name,
      description,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      access: {
        [userRole]: true,
        superadmin: userRole !== 'superadmin' // Add superadmin access if creator isn't superadmin
      }
    };
    
    await newProjectRef.set(projectData);
    
    res.status(201).json({ 
      message: 'Project created successfully',
      projectId: newProjectRef.key
    });
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update project access (admin/superadmin only)
exports.updateProjectAccess = async (req, res) => {
  const { id } = req.params;
  const { userIds, role } = req.body;
  const currentUserRole = req.headers.role;

  if (!id) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  if (currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can update project access' });
  }

  try {
    const projectRef = rtdb.ref(`projects/${id}`);
    const snapshot = await projectRef.once('value');
    const project = snapshot.val();
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Update access
    const updatedAccess = project.access || {};
    
    if (role) {
      updatedAccess[role] = true;
    }
    
    if (userIds && Array.isArray(userIds)) {
      userIds.forEach(userId => {
        updatedAccess[userId] = true;
      });
    }
    
    await projectRef.update({ access: updatedAccess });
    
    res.status(200).json({ message: 'Project access updated successfully' });
  } catch (error) {
    console.error('Error updating access:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update device status (admin/superadmin only)
exports.updateDeviceStatus = async (req, res) => {
  const { projectId, deviceId } = req.params;
  const { status, energy_usage, temperature } = req.body;
  const { role } = req.headers;

  try {
    // Authorization check
    if (role !== 'superadmin' && role !== 'admin') {
      return res.status(403).json({ message: "Permission denied" });
    }

    const deviceRef = rtdb.ref(`projects/${projectId}/devices/${deviceId}`);
    await deviceRef.update({
      status,
      energy_usage,
      temperature,
      last_updated: new Date().toISOString()
    });

    res.status(200).json({ message: "Device updated successfully" });
  } catch (error) {
    console.error('Device update error:', error);
    res.status(500).json({ message: "Failed to update device" });
  }
};
// In your projectController.js
exports.getProjects = async (req, res) => {
  const userId = req.headers.userid;
  const userRole = req.headers.role;
  
  try {
    const projectsRef = rtdb.ref('projects');
    const snapshot = await projectsRef.once('value');
    const allProjects = snapshot.val();

    if (!allProjects) {
      return res.status(200).json([]);
    }

    const accessibleProjects = [];
    for (const projectId in allProjects) {
      const project = allProjects[projectId];
      
      // For guests, check if project has user access or guest access is allowed
      if (userRole === 'guest') {
        accessibleProjects.push({
          id: projectId,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt || null
        });
      } 
      // For regular users, check normal access
      else if (project.access && (project.access[userRole] || project.access[userId])) {
        accessibleProjects.push({
          id: projectId,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt || null
        });
      }
    }
    
    res.status(200).json(accessibleProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Add these methods to your projectController.js

// Get all projects with guest access
exports.getGuestProjects = async (req, res) => {
  const userId = req.headers.userid;
  const email = req.headers.email;

  try {
    const projectsRef = rtdb.ref('projects');
    const snapshot = await projectsRef.once('value');
    const allProjects = snapshot.val();

    if (!allProjects) {
      return res.status(200).json([]);
    }

    // For guests, return all projects with their current access state
    const projectsWithAccess = [];
    const accessStates = {};

    // First check current access states from Firestore
    const accessRef = db.collection('projectAccess');
    const accessSnapshot = await accessRef.get();
    accessSnapshot.forEach(doc => {
      accessStates[doc.id] = doc.data();
    });

    // Then check queue positions
    const queueRef = db.collection('queues');
    const queueSnapshot = await queueRef.get();
    const queuePositions = {};
    queueSnapshot.forEach(doc => {
      const queue = doc.data().queue || [];
      queue.forEach((user, index) => {
        if (user.userId === userId) {
          queuePositions[doc.id] = index + 1;
        }
      });
    });

    // Prepare response
    for (const projectId in allProjects) {
      const project = allProjects[projectId];
      const accessState = accessStates[projectId] || { isFree: true };
      const queuePosition = queuePositions[projectId];

      projectsWithAccess.push({
        id: projectId,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt || null,
        access: {
          isFree: accessState.isFree,
          currentOccupant: accessState.currentOccupant,
          queuePosition: queuePosition
        }
      });
    }

    res.status(200).json(projectsWithAccess);
  } catch (error) {
    console.error('Error fetching guest projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handle guest access request
exports.handleGuestAccess = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.headers.userid;
  const email = req.headers.email;

  try {
    // Check if project exists
    const projectRef = rtdb.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const accessRef = db.collection('projectAccess').doc(projectId);
    const accessDoc = await accessRef.get();
    const accessData = accessDoc.exists ? accessDoc.data() : { isFree: true };

    if (accessData.isFree) {
      // Grant access
      await accessRef.set({
        isFree: false,
        currentOccupant: userId,
        lastAccessed: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Create session
      const sessionId = uuidv4();
      await db.collection('guestSessions').doc(sessionId).set({
        email,
        projectId,
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        timerEnds: new Date(Date.now() + 60000) // 60 seconds
      });

      return res.status(200).json({ 
        accessGranted: true,
        sessionId,
        timerEnds: new Date(Date.now() + 60000).toISOString()
      });
    } else {
      // Add to queue
      const queueRef = db.collection('queues').doc(projectId);
      const queueDoc = await queueRef.get();
      const currentQueue = queueDoc.exists ? queueDoc.data().queue || [] : [];
      
      // Check if user is already in queue
      const alreadyInQueue = currentQueue.some(user => user.userId === userId);
      if (alreadyInQueue) {
        const position = currentQueue.findIndex(user => user.userId === userId) + 1;
        return res.status(200).json({
          accessGranted: false,
          message: 'You are already in queue',
          position: position
        });
      }

      // Add to queue
      await queueRef.set({
        queue: [...currentQueue, {
          userId,
          email,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          priority: 5 // Lowest for guests
        }]
      }, { merge: true });

      return res.status(200).json({ 
        accessGranted: false,
        message: 'Added to queue',
        position: currentQueue.length + 1
      });
    }
  } catch (error) {
    console.error('Guest access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Fix for the requestProjectAccess function in projectController.js
exports.requestProjectAccess = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.headers.userid;
  const email = req.headers.email;
  const role = req.headers.role;

  if (!userId || !email) {
    return res.status(400).json({ message: 'Valid credentials are required' });
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

      // Create session with appropriate duration based on role
      const sessionId = uuidv4();
      
      // THIS IS THE KEY FIX: Ensure we're using the correct session duration for each role
      let sessionDuration;
      if (role === 'guest') {
        sessionDuration = config.guest.sessionDuration; // 60000 milliseconds (60 seconds)
      } else if (role === 'admin' || role === 'superadmin' || role === 'user') {
        sessionDuration = config.regular.sessionDuration; // 300000 milliseconds (5 minutes)
      } else {
        // Default fallback
        sessionDuration = config.guest.sessionDuration;
      }
      
      const timerEnds = new Date(Date.now() + sessionDuration);
      
      await db.collection('guestSessions').doc(sessionId).set({
        userId,
        email,
        role, // Store the role to know the type of user
        projectId,
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        timerEnds,
        extended: false
      });

      // Update user's active sessions count
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        activeSessions: admin.firestore.FieldValue.increment(1)
      });

      return res.status(200).json({ 
        accessGranted: true,
        sessionId,
        timerEnds: timerEnds.toISOString()
      });
    } else {
      // Add to queue with priority based on role
      const position = await getQueuePosition(projectId, userId);
      if (position) {
        return res.status(200).json({ 
          accessGranted: false,
          message: 'Already in queue',
          position
        });
      }

      // Get priority based on role
      let priority;
      switch(role) {
        case 'superadmin':
          priority = 1;
          break;
        case 'admin':
          priority = 2;
          break;
        case 'user':
          priority = 3;
          break;
        case 'guest':
        default:
          priority = 5;
          break;
      }

      // Fix for the serverTimestamp in array issue
      const queueRef = db.collection('queues').doc(projectId);
      const queueDoc = await queueRef.get();
      const currentQueue = queueDoc.exists ? queueDoc.data().queue || [] : [];
      
      // Create timestamp that works in arrays
      const nowTimestamp = admin.firestore.Timestamp.now();
      
      // Add user to queue with proper priority
      await queueRef.set({
        queue: [...currentQueue, {
          userId,
          email,
          role, // Store role to validate priority later
          joinedAt: nowTimestamp,
          priority: priority,
          requestedExtension: false
        }]
      }, { merge: true });

      return res.status(200).json({ 
        accessGranted: false,
        message: 'Added to queue',
        position: currentQueue.length + 1,
        estimatedWait: currentQueue.length * (role === 'guest' ? config.guest.sessionDuration : config.regular.sessionDuration)
      });
    }
  } catch (error) {
    console.error('Access request error:', error);
    res.status(500).json({ message: 'Server error during access request' });
  }
};