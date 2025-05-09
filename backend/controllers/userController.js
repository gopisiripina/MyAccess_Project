const { db } = require('../firebase');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
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

// Create temporary uploads directory
const uploadDir = path.join(__dirname, "temp_uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure cloudinary
cloudinary.config({
  cloud_name: "dlycx8dw3",
  api_key: "919845641398772",
  api_secret: "l417YAil5CVtAypMoA4Il7ZpOIo"
});

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (filePath, folder = 'users') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      use_filename: true,
      unique_filename: true,
      overwrite: false
    });
    
    // Delete the local file after upload
    fs.unlinkSync(filePath);
    
    return {
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    // Delete the local file if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

// Middleware to handle a single file upload
exports.uploadSingleImage = upload.single('image');

// Add user with image
exports.addUser = async (req, res) => {
  const { email, password, role, name, mobile, priority } = req.body;
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
    
    // User data to be saved
    const userData = {
      email,
      password: defaultPassword,
      role,
      name,
      mobile,
      firstLogin: false,
      createdBy: creatorId,
      createdAt: new Date().toISOString()
    };

    // Only add priority for users, not for admins or superadmins
    if (role === 'user') {
      // Convert priority to boolean, default to false if not provided
      userData.priority = priority === 'true' || priority === true ? true : false;
    }

    // Upload image to cloudinary if provided
    if (req.file) {
      try {
        const imageResult = await uploadToCloudinary(req.file.path);
        userData.profileImage = imageResult.url;
        userData.profileImageId = imageResult.public_id;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue without image if upload fails
      }
    }

    const userRef = await db.collection('users').add(userData);
    await sendCredentialsEmail(email, defaultPassword, role);

    res.status(201).json({ message: `${role} added successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit user with image
exports.editUser = async (req, res) => {
  const { id } = req.params;
  const { email, role, name, mobile, priority } = req.body;
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
    if (typeof name !== 'undefined') updateData.name = name;
    if (typeof mobile !== 'undefined') updateData.mobile = mobile;
    
    // Only update priority if the target user is or will be a regular user
    const targetRole = role || userData.role;
    if (targetRole === 'user' && typeof priority !== 'undefined') {
      // Convert priority to boolean
      updateData.priority = priority === 'true' || priority === true ? true : false;
    }
    
    // If role is changing from user to admin/superadmin, remove priority field
    if (userData.role === 'user' && targetRole !== 'user' && userData.hasOwnProperty('priority')) {
      // Using Firebase's FieldValue.delete() to remove the field
      // Since we don't have direct access to FieldValue here, we'll update differently
      await userDoc.update({
        priority: firebase.firestore.FieldValue.delete()
      });
    }

    // Handle image upload if provided
    if (req.file) {
      try {
        // If user already has an image, delete it from Cloudinary
        if (userData.profileImageId) {
          try {
            await cloudinary.uploader.destroy(userData.profileImageId);
          } catch (deleteError) {
            console.error('Error deleting previous image:', deleteError);
            // Continue even if deletion fails
          }
        }
        
        // Upload new image
        const imageResult = await uploadToCloudinary(req.file.path);
        updateData.profileImage = imageResult.url;
        updateData.profileImageId = imageResult.public_id;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue without changing image if upload fails
      }
    }

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

    // If user has profile image, delete from Cloudinary
    if (userData.profileImageId) {
      try {
        await cloudinary.uploader.destroy(userData.profileImageId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Continue with user deletion even if image deletion fails
      }
    }

    await userDoc.delete();
    res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (unchanged)
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

// Delete image from Cloudinary
exports.deleteUserImage = async (req, res) => {
  const { id } = req.params;
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

    // Check if user has a profile image
    if (!userData.profileImageId) {
      return res.status(404).json({ message: 'No profile image found' });
    }

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(userData.profileImageId);

    // Update user document in Firestore
    await userDoc.update({
      profileImage: null,
      profileImageId: null,
      updatedBy: editorId,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Profile image deleted successfully' });
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

// Toggle user priority (new endpoint)
exports.toggleUserPriority = async (req, res) => {
  const { id } = req.params;
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

    // Verify the target is a user (not admin/superadmin)
    if (userData.role !== 'user') {
      return res.status(400).json({ message: 'Priority can only be set for regular users' });
    }

    // Check if editor has permission to modify this user
    if (!canPerformAction(editorRole, userData.role)) {
      return res.status(403).json({ message: `${editorRole} cannot edit ${userData.role}` });
    }

    // Toggle the current priority value
    const newPriorityValue = !(userData.priority === true);
    
    await userDoc.update({
      priority: newPriorityValue,
      updatedBy: editorId,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ 
      message: `User priority ${newPriorityValue ? 'enabled' : 'disabled'} successfully`,
      priority: newPriorityValue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};