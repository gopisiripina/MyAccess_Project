require('dotenv').config(); // Load environment variables first
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL // Will now be correctly loaded
});

// Initialize Firestore and Realtime Database
const db = admin.firestore();
const rtdb = admin.database();

module.exports = { admin, db, rtdb };
