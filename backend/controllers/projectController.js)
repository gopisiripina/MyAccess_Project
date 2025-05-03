const { rtdb } = require('../firebase'); // Import only what's needed

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

    // Check access
    if (!projectData.access || (!projectData.access[role] && !projectData.access[userid])) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(projectData);
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