//routes/guestRoutes.js
const express = require('express');
const router = express.Router();
const { 
  guestLogin, 
  requestProjectAccess, 
  endSession,
  requestTimeExtension,
  getQueueStatus,
  getProjectQueueDetails
} = require('../controllers/guestController');
const { guestAuth, guestRateLimiter } = require('../middleware/guestAuth');

// Explicit guest login endpoint
router.post('/login', guestRateLimiter, guestLogin);

// Project access routes
router.post('/projects/:projectId/request-access', guestAuth, requestProjectAccess);

// Queue status routes
router.get('/projects/:projectId/queue-status', guestAuth, getQueueStatus);
router.get('/projects/:projectId/queue-details',guestAuth, getProjectQueueDetails); // For admins

// Session management routes
router.post('/sessions/:sessionId/end', guestAuth, endSession);
router.post('/sessions/:sessionId/request-extension', guestAuth, requestTimeExtension);

module.exports = router;