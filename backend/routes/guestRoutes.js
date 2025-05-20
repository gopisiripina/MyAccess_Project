const express = require('express');
const router = express.Router();
const { 
  guestLogin, 
  requestProjectAccess, 
  endSession,
  requestTimeExtension
} = require('../controllers/guestController');
const { guestAuth, guestRateLimiter } = require('../middleware/guestAuth');

// Explicit guest login endpoint
router.post('/login', guestRateLimiter, guestLogin);

// Other routes remain the same
router.post('/projects/:projectId/request-access', guestAuth, requestProjectAccess);
router.post('/sessions/:sessionId/end', guestAuth, endSession);
router.post('/sessions/:sessionId/request-extension', guestAuth, requestTimeExtension);

module.exports = router;