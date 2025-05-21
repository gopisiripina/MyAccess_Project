module.exports = {
  guest: {
    sessionDuration: 60000, // 60 seconds in milliseconds
    sessionExtensionDuration: 60000, // Additional 60 seconds for extensions
    priority: 5, // Lowest priority (higher number = lower priority)
    // Remove the maxActiveSessions limit or set it to a very high number
    // maxActiveSessions: 999, // Set this to a high number if you need to keep the field
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  regular: {
    sessionDuration: 300000, // 5 minutes in milliseconds
    sessionExtensionDuration: 300000, // Additional 5 minutes for extensions
    priority: {
      superadmin: 1,
      admin: 2,
      priorityUser: 3,
      user: 4
    }
  }
};