import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('');
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
    name: '',
    mobile: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (!role) {
      navigate('/');
      return;
    }
    setUserRole(role);

    if ((role === 'admin' && activeTab === 'admins') || 
        (role === 'user' && (activeTab === 'admins' || activeTab === 'users'))) {
      setActiveTab('dashboard');
    }

    if ((activeTab === 'users' || activeTab === 'admins') && (role === 'superadmin' || (role === 'admin' && activeTab === 'users'))) {
      fetchUsers();
    }
    
    // Clear any leftover editing state when tab changes
    if (showModal) {
      setShowModal(false);
      setIsEditMode(false);
      setEditUserId(null);
      setFormData({ email: '', password: '', role: 'user', name: '', mobile: '' });
    }
  }, [activeTab, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const loggedInUserId = localStorage.getItem('userId');
      const role = localStorage.getItem('userRole');
      
      if (!loggedInUserId || !role) {
        navigate('/');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'userid': loggedInUserId,
          'role': role
        }
      };

      const response = await axios.get('http://localhost:5000/api/users', config);
      
      let filteredUsers = response.data;
      if (activeTab === 'admins') {
        filteredUsers = response.data.filter(user => user.role === 'admin');
      } else if (activeTab === 'users') {
        filteredUsers = response.data.filter(user => user.role === 'user');
      }
      
      setUsers(filteredUsers);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
  
      const loggedInUserId = localStorage.getItem('userId');
      const role = localStorage.getItem('userRole');
  
      if (!loggedInUserId || !role) {
        navigate('/');
        return;
      }
  
      // Determine role to add based on current user's role and active tab
      // Don't rely on formData.role since we'll be hiding the dropdown
      let roleToAdd = 'user'; // Default role
      
      if (role === 'admin') {
        roleToAdd = 'user'; // Admins can only add users
      } else if (role === 'superadmin') {
        if (activeTab === 'admins') {
          roleToAdd = 'admin'; // Superadmin adding from admins tab
        } else {
          roleToAdd = 'user'; // Superadmin adding from users tab
        }
      }
  
      const userData = {
        email: formData.email,
        password: formData.password,
        role: roleToAdd,
        name: formData.name,
        mobile: formData.mobile
      };
  
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'userid': loggedInUserId,
          'role': role
        }
      };
  
      await axios.post('http://localhost:5000/api/users/add', userData, config);
  
      setFormData({ email: '', password: '', role: 'user', name: '', mobile: '' });
      setShowModal(false);
      fetchUsers();
  
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.response?.data?.message || 'Failed to add user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    console.log("Edit clicked for user:", user);
    setFormData({
      email: user.email,
      password: '', // Password is not shown in edit mode
      role: user.role,
      name: user.name || '',
      mobile: user.mobile || ''
    });
    // Store the user ID for editing
    const userId = user._id || user.id; // Handle different ID field names
    console.log("Setting editUserId to:", userId);
    setEditUserId(userId);
    setIsEditMode(true);
    setShowModal(true);
  };
  
  const handleEditUser = async (e) => {
    e.preventDefault();
  
    try {
      setLoading(true);
      setError('');
  
      const loggedInUserId = localStorage.getItem('userId');
      const role = localStorage.getItem('userRole');
  
      console.log("Current editUserId:", editUserId);
      
      if (!loggedInUserId || !role) {
        navigate('/');
        return;
      }
      
      if (!editUserId) {
        console.error('No user ID available for editing');
        setError('No user selected for editing. Please try again.');
        setLoading(false);
        return;
      }
  
      const updatedData = {
        email: formData.email,
        role: formData.role,
        name: formData.name,
        mobile: formData.mobile
      };
  
      // If admin is editing, they can't change the role
      if (role === 'admin') {
        updatedData.role = 'user';
      }
  
      // Ensure we're not promoting to superadmin unless we are superadmin
      if (role === 'superadmin' && updatedData.role === 'superadmin') {
        // Only allow if the user was already a superadmin
        const userBeingEdited = users.find(user => user._id === editUserId || user.id === editUserId);
        if (userBeingEdited && userBeingEdited.role !== 'superadmin') {
          updatedData.role = 'admin'; // Limit promotion to admin
        }
      }
  
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'userid': loggedInUserId,
          'role': role
        }
      };
      
      console.log('Editing user with ID:', editUserId);
      console.log('Updated data:', updatedData);
      await axios.patch(`http://localhost:5000/api/users/edit/${editUserId}`, updatedData, config);
  
      setShowModal(false);
      setFormData({ email: '', password: '', role: 'user', name: '', mobile: '' });
      setIsEditMode(false);
      setEditUserId(null);
      fetchUsers();
  
    } catch (err) {
      console.error('Error editing user:', err);
      setError(err.response?.data?.message || 'Failed to edit user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userIdToDelete) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const loggedInUserId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');
  
        if (!loggedInUserId || !role) {
          navigate('/');
          return;
        }
  
        const config = {
          headers: {
            'userid': loggedInUserId,
            'role': role
          }
        };
  
        await axios.delete(`http://localhost:5000/api/users/delete/${userIdToDelete}`, config);
        fetchUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Failed to delete user. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/');
  };

  const renderDashboardContent = () => {
    return (
      <div className="dashboard-welcome">
        <h2>{userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard</h2>
        <p>Welcome to your personalized dashboard.</p>
      </div>
    );
  };

  // Function to render role options based on user role and context
  const renderRoleOptions = () => {
    // Default options based on logged in user's role
    if (userRole === 'superadmin') {
      // In edit mode, if user being edited is a superadmin, show the superadmin option
      const userBeingEdited = isEditMode ? users.find(user => user._id === editUserId || user.id === editUserId) : null;
      const showSuperadminOption = isEditMode && userBeingEdited && userBeingEdited.role === 'superadmin';
      
      return (
        <>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          {showSuperadminOption && <option value="superadmin">Superadmin</option>}
        </>
      );
    } else if (userRole === 'admin') {
      // Admins can only manage users, so only show user option
      return <option value="user">User</option>;
    }
    
    // Default case - only user option
    return <option value="user">User</option>;
  };

  const renderUsersList = (title, isAdminsList = false) => {
    return (
      <div className="users-list-container">
        <div className="users-header">
          <h2>{title}</h2>
          {(userRole === 'superadmin' || (userRole === 'admin' && !isAdminsList)) && (
            <button 
              className="add-button"
              onClick={() => {
                setIsEditMode(false);
                // When adding a new user, set the role automatically based on the tab
                setFormData({ 
                  email: '', 
                  password: '', 
                  role: isAdminsList ? 'admin' : 'user',
                  name: '',
                  mobile: ''
                });
                setShowModal(true);
              }}
            >
              + Add {isAdminsList ? 'Admin' : 'User'}
            </button>
          )}
        </div>
        
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => {
                  const userId = user._id || user.id; // Handle both MongoDB and Firestore ID formats
                  return (
                    <tr key={userId}>
                      <td>{user.name || '-'}</td> 
                      <td>{user.email}</td>
                      <td>{user.mobile || '-'}</td>
                      <td>{user.role}</td>
                      <td>
                        <button 
                          className="edit-button"
                          onClick={() => handleEditClick(user)}
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteUser(userId)}
                          disabled={user.role === 'superadmin'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5">No {isAdminsList ? 'admins' : 'users'} found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'admins':
        return userRole === 'superadmin' ? renderUsersList('Admins', true) : null;
      case 'users':
        return (userRole === 'superadmin' || userRole === 'admin') ? renderUsersList('Users') : null;
      default:
        return renderDashboardContent();
    }
  };

  const renderModal = () => {
    if (!showModal) return null;

    const modalTitle = isEditMode 
      ? `Edit ${formData.role === 'admin' ? 'Admin' : 'User'}`
      : activeTab === 'admins' 
        ? 'Add Admin' 
        : 'Add User';

    // Debug info
    if (isEditMode) {
      console.log("Modal - Edit Mode:", isEditMode);
      console.log("Modal - Edit User ID:", editUserId);
      console.log("Modal - Form Data:", formData);
    }

    // Determine if role select should be shown (only for editing, not for adding)
    const showRoleSelect = (userRole === 'superadmin') || 
                          (userRole === 'admin' && activeTab === 'users');

    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>{modalTitle}</h3>
            <button 
              className="close-button" 
              onClick={() => {
                setShowModal(false);
                setIsEditMode(false);
                setEditUserId(null);
                setFormData({ email: '', password: '', role: 'user', name: '', mobile: '' });
              }}
            >
              ×
            </button>
          </div>
          <form onSubmit={isEditMode ? handleEditUser : handleAddUser}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {!isEditMode && (
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="mobile">Mobile</label>
              <input
                type="text"
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
              />
            </div>

            {/* Only show role dropdown when editing (not when adding) */}
            {showRoleSelect && isEditMode && (
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  {renderRoleOptions()}
                </select>
              </div>
            )}

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => {
                  setShowModal(false);
                  setIsEditMode(false);
                  setEditUserId(null);
                  setFormData({ email: '', password: '', role: 'user', name: '', mobile: '' });
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading}>
                {loading 
                  ? (isEditMode ? 'Updating...' : 'Adding...') 
                  : (isEditMode ? 'Update' : 'Add')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const mainContentClass = `main-content ${!isSidebarOpen ? 'sidebar-closed' : ''}`;

  return (
    <div className="dashboard-container">
      <Sidebar 
        userRole={userRole} 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        onSidebarToggle={handleSidebarToggle}
      />
      <div className={mainContentClass}>
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
      {renderModal()}
    </div>
  );
};

export default Dashboard;