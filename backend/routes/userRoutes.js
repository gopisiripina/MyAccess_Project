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
const { checkAuth } = require('../middleware/route');

// User Routes with authentication middleware
router.post('/add', checkAuth, uploadSingleImage, addUser);  // Add multer middleware here
router.patch('/edit/:id', checkAuth, uploadSingleImage, editUser);  // Add multer middleware here
router.delete('/delete/:id', checkAuth, deleteUser);
router.get('/', checkAuth, getUsers);
router.get('/:id', checkAuth, getUserById);

module.exports = router;