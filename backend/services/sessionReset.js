//services/sessionReset/js
const { db } = require('../firebase');
const admin = require('firebase-admin');

/**
 * Reset the active sessions counter for a guest if it gets out of sync
 * This can be called periodically or when errors occur
 */
exports.resetGuestSessionCounter = async (userId) => {
  try {
    if (!userId || !userId.startsWith('guest_')) {
      console.warn('Invalid guest ID for session counter reset:', userId);
      return false;
    }
    
    // Count actual active sessions
    const sessionsQuery = await db.collection('guestSessions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    const actualCount = sessionsQuery.size;
    
    // Reset the counter to match actual active sessions
    await db.collection('users').doc(userId).update({
      activeSessions: actualCount
    });
    
    console.log(`Reset active sessions counter for ${userId} to ${actualCount}`);
    return true;
  } catch (error) {
    console.error('Error resetting guest session counter:', error);
    return false;
  }
};

/**
 * Utility function to reset ALL guest session counters 
 * Can be run periodically as a maintenance task
 */
exports.resetAllGuestSessionCounters = async () => {
  try {
    // Get all guest users
    const guestsQuery = await db.collection('users')
      .where('role', '==', 'guest')
      .get();
    
    if (guestsQuery.empty) {
      console.log('No guest users found');
      return true;
    }
    
    const batch = db.batch();
    const batchPromises = [];
    let currentBatchSize = 0;
    let batchCount = 1;
    
    // For each guest, get their actual active sessions
    for (const guestDoc of guestsQuery.docs) {
      const userId = guestDoc.id;
      
      // Count actual active sessions
      const sessionsQuery = await db.collection('guestSessions')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();
      
      const actualCount = sessionsQuery.size;
      
      // Add update to batch
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, { activeSessions: actualCount });
      
      currentBatchSize++;
      
      // Firestore batches are limited to 500 operations
      if (currentBatchSize >= 400) {
        batchPromises.push(batch.commit());
        currentBatchSize = 0;
        batchCount++;
      }
    }
    
    // Commit any remaining batches
    if (currentBatchSize > 0) {
      batchPromises.push(batch.commit());
    }
    
    await Promise.all(batchPromises);
    console.log(`Reset session counters for all guest users in ${batchCount} batches`);
    return true;
  } catch (error) {
    console.error('Error resetting all guest session counters:', error);
    return false;
  }
};