const express = require('express');
const router = express.Router();
const { 
  login, 
  changePassword, 
  forgotPassword, 
  verifyResetToken, 
  resetPassword 
} = require('../controllers/authController');

// Authentication Routes
router.post('/login', login);
router.post('/change-password', changePassword);
router.post('/forgot-password', forgotPassword);
router.get('/verify-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

module.exports = router;