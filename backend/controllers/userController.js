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

// Send welcome email with credentials
async function sendCredentialsEmail(email, password, role) {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: `Your New ${role.charAt(0).toUpperCase() + role.slice(1)} Account`,
    html: `
      <h1>Welcome!</h1>
      <p>Your account has been created. Here are your login credentials:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Default Password:</strong> ${password}</p>
      <p>For security reasons, you will be required to change your password upon first login.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Helper function to check if user can perform action based on roles
function canPerformAction(actorRole, targetRole) {
  const roleHierarchy = { 'superadmin': 3, 'admin': 2, 'user': 1 };
  
  // An actor can only perform actions on users with lower role levels
  return roleHierarchy[actorRole] > roleHierarchy[targetRole];
}

// Add new user or admin
exports.addUser = async (req, res) => {
  const { email, password, role, name, mobile } = req.body; // added name & mobile
  const creatorRole = req.headers.role;
  const creatorId = req.headers.userid;

  if (!email || !password || !role || !name || !mobile) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    if (creatorRole === 'admin' && role !== 'user') {
      return res.status(403).json({ message: 'Admins can only add users' });
    }

    if (creatorRole === 'superadmin' && !['admin', 'user'].includes(role)) {
      return res.status(403).json({ message: 'Invalid role specified' });
    }

    const defaultPassword = password || crypto.randomBytes(6).toString('hex');

    const userRef = await db.collection('users').add({
      email,
      password: defaultPassword,
      role,
      name,
      mobile,
      firstLogin: false,
      createdBy: creatorId,
      createdAt: new Date().toISOString()
    });

    await sendCredentialsEmail(email, defaultPassword, role);

    res.status(201).json({ message: `${role} added successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Edit user
exports.editUser = async (req, res) => {
  const { id } = req.params;
  const { email, role, name, mobile } = req.body; // added name & mobile
  const editorRole = req.headers.role;
  const editorId = req.headers.userid;

  if (!id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const userDoc = db.collection('users').doc(id);
    const user = await userDoc.get();

    if (!user.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user.data();

    if (!canPerformAction(editorRole, userData.role)) {
      return res.status(403).json({ message: `${editorRole} cannot edit ${userData.role}` });
    }

    if (role && !canPerformAction(editorRole, role)) {
      return res.status(403).json({ message: `Cannot change role to ${role}` });
    }

    const updateData = {
      updatedBy: editorId,
      updatedAt: new Date().toISOString()
    };

    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;

    await userDoc.update(updateData);
    res.status(200).json({ message: 'User updated successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Delete user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const deleterRole = req.headers.role;

  if (!id) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const userDoc = db.collection('users').doc(id);
    const user = await userDoc.get();

    if (!user.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = user.data();
    
    // Check if deleter has permission to delete this user
    if (!canPerformAction(deleterRole, userData.role)) {
      return res.status(403).json({ message: `${deleterRole} cannot delete ${userData.role}` });
    }

    await userDoc.delete();
    res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  const requestorRole = req.headers.role;
  
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      
      // Filter users based on requestor's role
      if (requestorRole === 'superadmin' || 
          (requestorRole === 'admin' && userData.role === 'user')) {
        // Don't send passwords in response
        const { password, resetToken, resetTokenExpiry, ...safeUserData } = userData;
        users.push({ id: doc.id, ...safeUserData });
      }
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  const requestorRole = req.headers.role;
  
  if (!id) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  try {
    const userDoc = await db.collection('users').doc(id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Check if requestor has permission to view this user
    if (!canPerformAction(requestorRole, userData.role) && requestorRole !== userData.role) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Don't send sensitive data
    const { password, resetToken, resetTokenExpiry, ...safeUserData } = userData;
    
    res.status(200).json({ id: userDoc.id, ...safeUserData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};