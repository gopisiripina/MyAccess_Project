//routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getProjects,
  getProjectById,
  addProject,
  updateProjectAccess,
  getProjectDashboard,
  updateDeviceStatus
} = require('../controllers/projectController.js'); // Fixed require path
const { checkAuth } = require('../middleware/Route');
const { requestProjectAccess } = require('../controllers/projectController');
const { getQueueStatus } = require('../controllers/guestController');

// Project Routes
router.get('/', checkAuth, getProjects);
router.get('/:id', checkAuth, getProjectById);
router.post('/add', checkAuth, addProject);
router.patch('/:id/access', checkAuth, updateProjectAccess);

// Dashboard and device routes
router.get('/:projectId/dashboard', checkAuth, getProjectDashboard);
router.post('/:projectId/device/:deviceId', checkAuth, updateDeviceStatus);
router.post('/:projectId/request-access', checkAuth, requestProjectAccess // Middleware to verify admin/user credentialsrequestProjectAccess // New handler in projectController.js
);
// Add this line to your projectRoutes.js
router.get('/:projectId/queue-status', checkAuth, getQueueStatus);

module.exports = router;