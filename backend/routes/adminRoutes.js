// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getActiveSessions,
  getAllQueues,
  getExtensionRequests,
  approveExtension,
  rejectExtension,
  getUsageLogs,
  endGuestSession,
  resetGuestCounter,
  resetAllGuestCounters
} = require('../controllers/adminController');
const { verifyUser, checkRole } = require('../middleware/authMiddleware');

// Apply middleware to all routes
router.use(verifyUser);

// Routes for both admin and superadmin
router.get('/guest-sessions', checkRole(['admin', 'superadmin']), getActiveSessions);
router.get('/queues', checkRole(['admin', 'superadmin']), getAllQueues);
router.get('/extension-requests', checkRole(['admin', 'superadmin']), getExtensionRequests);
router.post('/extension-requests/:requestId/approve', checkRole(['admin', 'superadmin']), approveExtension);
router.post('/extension-requests/:requestId/reject', checkRole(['admin', 'superadmin']), rejectExtension);
router.post('/guest-sessions/:sessionId/terminate', checkRole(['admin', 'superadmin']), endGuestSession);

// Superadmin-only routes
router.get('/usage-logs', checkRole(['superadmin']), getUsageLogs);
// Add these routes to your adminRoutes.js file

// Reset a specific guest's session counter
// router.post('/reset-guest-counter/:userId', checkRole(['admin', 'superadmin']), resetGuestCounter);
router.post('/reset-guest-counter/:userId', 
  (req, res, next) => {
    console.log('DEBUG: Reached reset-guest-counter route');
    next();
  },
  checkRole(['admin', 'superadmin']), 
  resetGuestCounter
);

// Reset all guests' session counters (superadmin only)
router.post('/reset-all-guest-counters', checkRole(['superadmin']), resetAllGuestCounters);
module.exports = router;