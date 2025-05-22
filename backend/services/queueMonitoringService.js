// services/queueMonitoringService.js
const { db } = require('../firebase');
const config = require('../config');

class QueueMonitoringService {
  
  // Get current queue status for a user
  async getQueueStatus(projectId, userId) {
    try {
      const queueRef = db.collection('queues').doc(projectId);
      const queueDoc = await queueRef.get();
      
      if (!queueDoc.exists) {
        return { inQueue: false, position: 0, estimatedWait: 0 };
      }
      
      const queueData = queueDoc.data();
      const queue = queueData.queue || [];
      
      // Find user position in queue
      const userIndex = queue.findIndex(user => user.userId === userId);
      
      if (userIndex === -1) {
        return { inQueue: false, position: 0, estimatedWait: 0 };
      }
      
      const position = userIndex + 1;
      
      // Get current session remaining time
      const currentSessionRemaining = await this.getCurrentSessionRemainingTime(projectId);
      
      // Calculate wait time based on priority
      let totalWaitTime = currentSessionRemaining;
      
      // Add time for users ahead in queue
      for (let i = 0; i < userIndex; i++) {
        const userAhead = queue[i];
        const sessionDuration = this.getSessionDurationByRole(userAhead.role);
        totalWaitTime += sessionDuration;
      }
      
      return {
        inQueue: true,
        position: position,
        estimatedWait: totalWaitTime,
        breakdown: {
          currentSessionRemaining: Math.ceil(currentSessionRemaining / 1000),
          usersAhead: userIndex,
          yourEstimatedTime: Math.ceil(totalWaitTime / 1000)
        }
      };
      
    } catch (error) {
      console.error('Queue status error:', error);
      return { inQueue: false, position: 0, estimatedWait: 0, error: true };
    }
  }
  
  // Get remaining time of current active session
  async getCurrentSessionRemainingTime(projectId) {
    try {
      const accessRef = db.collection('projectAccess').doc(projectId);
      const accessDoc = await accessRef.get();
      
      if (!accessDoc.exists || accessDoc.data().isFree) {
        return 0; // No active session
      }
      
      const currentOccupant = accessDoc.data().currentOccupant;
      
      // Find active session
      const sessionRef = db.collection('guestSessions')
        .where('userId', '==', currentOccupant)
        .where('projectId', '==', projectId)
        .where('status', '==', 'active')
        .limit(1);
        
      const sessionSnapshot = await sessionRef.get();
      
      if (sessionSnapshot.empty) {
        return 0;
      }
      
      const session = sessionSnapshot.docs[0].data();
      const now = new Date();
      const timerEnds = session.timerEnds.toDate();
      
      return Math.max(0, timerEnds.getTime() - now.getTime());
      
    } catch (error) {
      console.error('Current session time error:', error);
      return 0;
    }
  }
  
  // Get session duration based on user role
  getSessionDurationByRole(role) {
    switch(role) {
      case 'guest':
        return config.guest.sessionDuration;
      case 'user':
      case 'admin':
      case 'superadmin':
        return config.regular.sessionDuration;
      default:
        return config.guest.sessionDuration;
    }
  }
  
  // Get all users in queue with their wait times
  async getQueueDetails(projectId) {
    try {
      const queueRef = db.collection('queues').doc(projectId);
      const queueDoc = await queueRef.get();
      
      if (!queueDoc.exists) {
        return [];
      }
      
      const queue = queueDoc.data().queue || [];
      const currentSessionRemaining = await this.getCurrentSessionRemainingTime(projectId);
      
      let cumulativeWait = currentSessionRemaining;
      
      return queue.map((user, index) => {
        const waitTime = cumulativeWait;
        const sessionDuration = this.getSessionDurationByRole(user.role);
        cumulativeWait += sessionDuration;
        
        return {
          ...user,
          position: index + 1,
          estimatedWait: waitTime,
          estimatedWaitFormatted: Math.ceil(waitTime / 1000) + 's'
        };
      });
      
    } catch (error) {
      console.error('Queue details error:', error);
      return [];
    }
  }
}

module.exports = new QueueMonitoringService();