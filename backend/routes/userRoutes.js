const express = require('express');
const router = express.Router();
const { 
  addUser, 
  editUser, 
  deleteUser, 
  getUsers,
  getUserById,
  uploadSingleImage  // Import this from your controller
} = require('../controllers/userController');
const { checkAuth } = require('../middleware/Route');
const { verifyUser } = require('../middleware/authMiddleware');
const { requestProjectAccess } = require('../controllers/projectController');

// User Routes with authentication middleware
router.post('/add', checkAuth, uploadSingleImage, addUser);  // Add multer middleware here
router.patch('/edit/:id', checkAuth, uploadSingleImage, editUser);  // Add multer middleware here
router.delete('/delete/:id', checkAuth, deleteUser);
router.get('/', checkAuth, getUsers);
router.get('/:id', checkAuth, getUserById);
// Apply middleware to all routes
router.use(verifyUser);

// Project access route for all types of users
router.post('/projects/:projectId/request-access', requestProjectAccess);


module.exports = router;