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
  const userEmail = req.headers.email;

  console.log('getProjects called with:', { userId, userRole, userEmail });

  try {
    // Validate required headers
    if (!userId || !userRole) {
      console.log('Missing required headers');
      return res.status(400).json({ message: 'Missing required authentication headers' });
    }

    const projectsRef = rtdb.ref('projects');
    const snapshot = await projectsRef.once('value');
    const allProjects = snapshot.val();
    
    console.log('Raw projects data:', allProjects ? Object.keys(allProjects) : 'No projects');
    
    if (!allProjects) {
      console.log('No projects found in database');
      return res.status(200).json([]); // Return empty array if no projects exist
    }
    
    const accessibleProjects = [];
    
    for (const projectId in allProjects) {
      const project = allProjects[projectId];
      
      console.log(`Checking access for project ${projectId}:`, {
        projectAccess: project.access,
        userRole,
        userId,
        hasRoleAccess: project.access && project.access[userRole],
        hasUserAccess: project.access && project.access[userId]
      });
      
      // For guests, return all projects (they'll be filtered by queue system)
      if (userRole === 'guest') {
        accessibleProjects.push({
          id: projectId,
          name: project.name || `Project ${projectId}`,
          description: project.description || 'No description available',
          createdAt: project.createdAt || null
        });
      } 
      // For regular users, check normal access
      else if (project.access && (project.access[userRole] || project.access[userId])) {
        accessibleProjects.push({
          id: projectId,
          name: project.name || `Project ${projectId}`,
          description: project.description || 'No description available',
          createdAt: project.createdAt || null
        });
      }
    }
    
    console.log('Accessible projects for user:', accessibleProjects.map(p => ({ id: p.id, name: p.name })));
    res.status(200).json(accessibleProjects);
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
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
    if (userRole !== 'guest' && (!project.access || (!project.access[userRole] && !project.access[userId]))) {
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
exports.getProjectDashboard = async (req, res) => {
  const { projectId } = req.params;
  const { userid, role } = req.headers;

  console.log('getProjectDashboard called:', { projectId, userid, role });

  try {
    const projectRef = rtdb.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    const projectData = snapshot.val();

    if (!projectData) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // For superadmin, admin, and regular users with direct access
    if (role === 'admin' || role === 'superadmin' || role === 'user') { 
      // Check if user has access through role or specific user access
      if (projectData.access && (projectData.access[role] || projectData.access[userid])) {
        // Return full project data for authorized users
        return res.status(200).json(projectData);
      }
      return res.status(403).json({ message: "Access denied" });
    }

    // Guest-specific access flow
    if (role === 'guest') {
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
          // Include basic device info for guests
          devices: projectData.devices ? Object.entries(projectData.devices).reduce((acc, [key, value]) => {
            acc[key] = {
              name: value.name || key,
              status: value.status || 'Unknown',
              energy_usage: value.energy_usage,
              temperature: value.temperature,
              last_updated: value.last_updated
            };
            return acc;
          }, {}) : {},
          // Include basic vehicle info for guests
          vehicles: projectData.vehicles ? Object.entries(projectData.vehicles).reduce((acc, [key, value]) => {
            acc[key] = {
              name: value.name || key,
              location: value.location,
              speed: value.speed
            };
            return acc;
          }, {}) : {}
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
    }

    // Unknown role
    return res.status(403).json({ message: "Invalid user role" });

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

// Handle guest access request
exports.requestProjectAccess = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.headers.userid;
  const email = req.headers.email;
  const role = req.headers.role;

  console.log('requestProjectAccess called:', { projectId, userId, email, role });

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

    // Check if user already has active session
    const activeSession = await db.collection('guestSessions')
      .where('userId', '==', userId)
      .where('projectId', '==', projectId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!activeSession.empty) {
      const session = activeSession.docs[0].data();
      const timerEnds = session.timerEnds.toDate();
      const remainingTime = timerEnds.getTime() - Date.now();
      
      if (remainingTime > 0) {
        return res.status(200).json({
          accessGranted: true,
          sessionId: activeSession.docs[0].id,
          timerEnds: timerEnds.toISOString(),
          remainingTime: remainingTime
        });
      }
    }

    // Check current access state
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

      // Create session with appropriate duration based on role
      const sessionId = uuidv4();
      
      let sessionDuration;
      if (role === 'guest') {
        sessionDuration = config?.guest?.sessionDuration || 60000; // 60 seconds default
      } else if (role === 'admin' || role === 'superadmin' || role === 'user') {
        sessionDuration = config?.regular?.sessionDuration || 300000; // 5 minutes default
      } else {
        sessionDuration = 60000; // Default fallback
      }
      
      const timerEnds = new Date(Date.now() + sessionDuration);
      
      await db.collection('guestSessions').doc(sessionId).set({
        userId,
        email,
        role,
        projectId,
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        timerEnds,
        extended: false
      });

      // Update user's active sessions count
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
          activeSessions: admin.firestore.FieldValue.increment(1)
        });
      } catch (userUpdateError) {
        console.warn('Could not update user session count:', userUpdateError);
      }

      return res.status(200).json({ 
        accessGranted: true,
        sessionId,
        timerEnds: timerEnds.toISOString(),
        remainingTime: sessionDuration
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

      // Add user to queue
      const queueRef = db.collection('queues').doc(projectId);
      const queueDoc = await queueRef.get();
      const currentQueue = queueDoc.exists ? queueDoc.data().queue || [] : [];
      
      const nowTimestamp = admin.firestore.Timestamp.now();
      
      await queueRef.set({
        queue: [...currentQueue, {
          userId,
          email,
          role,
          joinedAt: nowTimestamp,
          priority: priority,priority: priority,
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