// This code updates the Dashboard.jsx component to:
// 1. Remove the redundant loading spinner at the top of the form
// 2. Improve the loading effect when fetching users
// 3. Fix action button alignment
// 4. Fix content positioning when sidebar is closed

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import '../styles/Dashboard.css';
import ProjectsList from './ProjectsList';
import { useSearchParams } from 'react-router-dom';

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
    mobile: '',
    profileImage: '',
    profileImageId: ''
  });
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false); // Separate loading state for users fetch
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  useEffect(() => {
    if (urlTab && ['dashboard', 'admins', 'users', 'devices'].includes(urlTab)) {
     setActiveTab(urlTab);
    }
  }, [urlTab]);

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
      resetFormState();
    }
  }, [activeTab, navigate]);

  const resetFormState = () => {
    setFormData({ 
      email: '', 
      password: '', 
      role: 'user', 
      name: '', 
      mobile: '',
      profileImage: '',
      profileImageId: ''
    });
    setSelectedImage(null);
    setImagePreview('');
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true); // Use separate loading state for users fetch
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
      setUsersLoading(false); // Use separate loading state for users fetch
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (optional)
      const maxSizeInMB = 5;
      const fileSizeInMB = file.size / (1024 * 1024);
      
      if (fileSizeInMB > maxSizeInMB) {
        setError(`Image size should be less than ${maxSizeInMB}MB`);
        return;
      }
      
      setSelectedImage(file);
      
      // Create object URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous errors
      if (error) setError('');
    }
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
  
      // Create FormData object for sending to backend
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('role', roleToAdd);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('mobile', formData.mobile);
      
      // Append file as 'image' if one is selected
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }
  
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for file upload
          'userid': loggedInUserId,
          'role': role
        }
      };
  
      await axios.post('http://localhost:5000/api/users/add', formDataToSend, config);
  
      resetFormState();
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
      mobile: user.mobile || '',
      profileImage: user.profileImage || '',
      profileImageId: user.profileImageId || ''
    });
    
    if (user.profileImage) {
      setImagePreview(user.profileImage);
    } else {
      setImagePreview('');
    }
    
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
  
      // Create FormData object for sending to backend
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('mobile', formData.mobile);
      
      // Only append role if authorized to change it
      let roleToUpdate = formData.role;
      if (role === 'admin') {
        roleToUpdate = 'user'; // Admins can't change role
      }
      // Ensure we're not promoting to superadmin unless we are superadmin
      if (role === 'superadmin' && roleToUpdate === 'superadmin') {
        // Only allow if the user was already a superadmin
        const userBeingEdited = users.find(user => user._id === editUserId || user.id === editUserId);
        if (userBeingEdited && userBeingEdited.role !== 'superadmin') {
          roleToUpdate = 'admin'; // Limit promotion to admin
        }
      }
      formDataToSend.append('role', roleToUpdate);
      
      // Append file as 'image' if a new one is selected
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }
      
      // Current profile image data is already on the backend
      // No need to send existing image info as backend will keep it if no new image
  
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for file upload
          'userid': loggedInUserId,
          'role': role
        }
      };
      
      console.log('Editing user with ID:', editUserId);
      await axios.patch(`http://localhost:5000/api/users/edit/${editUserId}`, formDataToSend, config);
  +
      setShowModal(false);
      resetFormState();
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

  const renderUserAvatar = (user) => {
    if (user.profileImage) {
      return (
        <img 
          src={user.profileImage} 
          alt={`${user.name || 'User'}'s avatar`} 
          className="user-avatar" 
        />
      );
    } else {
      // Default avatar with user's initials
      const initials = user.name 
        ? user.name.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2)
        : user.email.substring(0, 2).toUpperCase();
      
      return (
        <div className="user-avatar-placeholder">
          {initials}
        </div>
      );
    }
  };

  // Enhanced loading spinner component with improved animation
  const renderLoadingSpinner = () => {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <div className="loading-text loading-pulse">Loading users...</div>
      </div>
    );
  };

  // Enhanced loading placeholder rows for tables with pulse animation
  const renderLoadingRows = () => {
    return (
      <>
        {[1, 2,3,4,5].map((item) => (
          <tr key={`loading-${item}`} className="loading-row-placeholder">
            <td>
              <div className="user-name-cell">
                <div className="user-avatar-placeholder loading-pulse"></div>
                <div className="loading-cell-content"></div>
              </div>
            </td>
            <td><div className="loading-cell-content"></div></td>
            <td><div className="loading-cell-content"></div></td>
            <td><div className="loading-cell-content"></div></td>
            <td><div className="loading-cell-content"></div></td>
          </tr>
        ))}
      </>
    );
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
                resetFormState();
                setFormData(prevState => ({
                  ...prevState,
                  role: isAdminsList ? 'admin' : 'user'
                }));
                setShowModal(true);
              }}
            >
              + Add {isAdminsList ? 'Admin' : 'User'}
            </button>
          )}
        </div>
        
        <div className="table-container">
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
              {usersLoading ? (
                renderLoadingRows()
              ) : error ? (
                <tr>
                  <td colSpan="5" className="error-message">{error}</td>
                </tr>
              ) : users.length > 0 ? (
                users.map(user => {
                  const userId = user._id || user.id; // Handle both MongoDB and Firestore ID formats
                  return (
                    <tr key={userId}>
                      <td>
                        <div className="user-name-cell">
                          {renderUserAvatar(user)}
                          <span className="user-name">{user.name || '-'}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.mobile || '-'}</td>
                      <td>{user.role}</td>
                      <td>
                        <div className="action-buttons">
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
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="no-results">No {isAdminsList ? 'admins' : 'users'} found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
      case 'devices':
        return <ProjectsList userRole={userRole} />;
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
                resetFormState();
              }}
            >
              ×
            </button>
          </div>
          {/* Redundant loading spinner removed */}
          <form onSubmit={isEditMode ? handleEditUser : handleAddUser}>
            <div className="form-group image-upload-container">
              <label>Profile Image</label>
              <div className="image-preview-wrapper">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Profile preview" 
                    className="image-preview" 
                  />
                ) : (
                  <div className="image-placeholder">
                    <span>No Image</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="profileImage"
                name="profileImage"
                accept="image/*"
                onChange={handleImageChange}
                className="image-input"
              />
              <label htmlFor="profileImage" className="image-input-label">
                Choose Image
              </label>
            </div>

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
                  resetFormState();
                }}
                disabled={loading}
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className={loading ? "submit-button loading-button" : "submit-button"}
              >
                {loading ? (
                  <span className="button-loading-content">
                    <span className="button-spinner"></span>
                    <span>{isEditMode ? 'Updating...' : 'Adding...'}</span>
                  </span>
                ) : (
                  isEditMode ? 'Update' : 'Add'
                )}
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
        isOpen={isSidebarOpen} // Pass the current state to Sidebar
      />
      <div className={mainContentClass}>
        {error && !usersLoading && (
          <div className="global-error-message">{error}</div>
        )}
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
      {renderModal()}
    </div>
  );
};

export default Dashboard;