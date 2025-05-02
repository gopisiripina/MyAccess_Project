const { db } = require('../firebase');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  // Replace with your email service config
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-email-password'
  }
});

// Login Controller
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let user;
    snapshot.forEach(doc => {
      user = { id: doc.id, ...doc.data() };
    });

    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if this is the first login
    if (user.firstLogin === false) {
      return res.status(200).json({ 
        message: 'First login detected',
        requirePasswordChange: true,
        userId: user.id,
        role: user.role
      });
    }

    res.status(200).json({ 
      message: 'Login successful', 
      role: user.role, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password on first login
exports.changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();

    if (userData.password !== currentPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password and firstLogin flag
    await userRef.update({
      password: newPassword,
      firstLogin: true
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password - request reset
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'User not found' });
    }

    let userId;
    snapshot.forEach(doc => {
      userId = doc.id;
    });

    // Generate reset token and expiry (24 hours)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 86400000; // 24 hours in milliseconds

    // Update user with reset token info
    await db.collection('users').doc(userId).update({
      resetToken,
      resetTokenExpiry
    });

    // Create reset link (replace with your frontend URL)
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset',
      html: `
        <h1>Password Reset Request</h1>
        <p>Please click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 24 hours.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify reset token
exports.verifyResetToken = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('resetToken', '==', token).get();

    if (snapshot.empty) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    let user;
    snapshot.forEach(doc => {
      user = { id: doc.id, ...doc.data() };
    });

    // Check if token is expired
    if (user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    res.status(200).json({ message: 'Token verified', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('resetToken', '==', token).get();

    if (snapshot.empty) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    let userId;
    let user;
    snapshot.forEach(doc => {
      userId = doc.id;
      user = doc.data();
    });

    // Check if token is expired
    if (user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Update password and clear reset token data
    await db.collection('users').doc(userId).update({
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null,
      firstLogin: true
    });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};