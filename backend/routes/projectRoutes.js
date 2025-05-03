const express = require('express');
const router = express.Router();
const { 
  getProjects,
  getProjectById,
  addProject,
  updateProjectAccess,
  getProjectDashboard,
  updateDeviceStatus
} = require('../controllers/projectController.js)'); // Fixed require path
const { checkAuth } = require('../middleware/route');

// Project Routes
router.get('/', checkAuth, getProjects);
router.get('/:id', checkAuth, getProjectById);
router.post('/add', checkAuth, addProject);
router.patch('/:id/access', checkAuth, updateProjectAccess);

// Dashboard and device routes
router.get('/:projectId/dashboard', checkAuth, getProjectDashboard);
router.post('/:projectId/device/:deviceId', checkAuth, updateDeviceStatus);

module.exports = router;