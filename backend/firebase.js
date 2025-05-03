const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL // Replace with your actual Realtime DB URL
});

// Initialize Firestore and Realtime Database
const db = admin.firestore(); // Firestore instance
const rtdb = admin.database(); // Realtime Database instance

module.exports = { admin, db, rtdb };