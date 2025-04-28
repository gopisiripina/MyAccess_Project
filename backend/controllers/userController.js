const admin = require('firebase-admin');
const db = admin.firestore();

// Add new user or admin
exports.addUser = async (req, res) => {
  const { email, password, role } = req.body;
  const creatorRole = req.headers.role; // Fetch role from header

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Admin cannot add admins
    if (creatorRole === 'admin' && role !== 'user') {
      return res.status(403).json({ message: 'Admins can only add users' });
    }

    await db.collection('users').add({
      email,
      password,
      role
    });

    res.status(201).json({ message: `${role} added successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit user
exports.editUser = async (req, res) => {
  const { id } = req.params;
  const { email, password, role } = req.body;
  const editorRole = req.headers.role;

  try {
    const userDoc = db.collection('users').doc(id);
    const user = await userDoc.get();

    if (!user.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin cannot edit admins
    if (editorRole === 'admin' && user.data().role !== 'user') {
      return res.status(403).json({ message: 'Admins can only edit users' });
    }

    await userDoc.update({ email, password, role });
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

  try {
    const userDoc = db.collection('users').doc(id);
    const user = await userDoc.get();

    if (!user.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin cannot delete admins
    if (deleterRole === 'admin' && user.data().role !== 'user') {
      return res.status(403).json({ message: 'Admins can only delete users' });
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
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(users);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
