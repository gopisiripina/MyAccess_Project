const express = require('express');
const router = express.Router();
const { 
  addUser, 
  editUser, 
  deleteUser, 
  getUsers,
  getUserById
} = require('../controllers/userController');
const { checkAuth } = require('../middleware/route');

// User Routes with authentication middleware
router.post('/add', checkAuth, addUser);
router.patch('/edit/:id', checkAuth, editUser); // Changed from PUT to PATCH
router.delete('/delete/:id', checkAuth, deleteUser);
router.get('/', checkAuth, getUsers);
router.get('/:id', checkAuth, getUserById);

module.exports = router;