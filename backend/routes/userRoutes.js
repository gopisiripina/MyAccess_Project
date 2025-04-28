const express = require('express');
const router = express.Router();
const { addUser, editUser, deleteUser, getUsers } = require('../controllers/userController');

// User Routes
router.post('/add', addUser);
router.put('/edit/:id', editUser);
router.delete('/delete/:id', deleteUser);
router.get('/', getUsers);

module.exports = router;
