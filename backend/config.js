// config.js
module.exports = {
  guest: {
    sessionDuration: 60000, // 60 seconds
    sessionExtensionDuration: 30000, // 30 seconds
    maxActiveSessions: 1,
    priority: 5, // Lowest priority
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // Limit each IP to 100 requests per windowMs
    }
  },
  regular: {
    sessionDuration: 300000, // 5 minutes for regular users
    sessionExtensionDuration: 300000 // 5 minutes extension
  },
  priorities: {
    superadmin: 1,
    admin: 2,
    user: 3,
    priorityUser: 4,
    guest: 5
  }
};