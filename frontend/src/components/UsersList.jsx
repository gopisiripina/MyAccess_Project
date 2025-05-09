// UsersList.jsx - Component for managing user accounts
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserModal from './UserModal';

const UsersList = ({ userRole }) => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    // password: '',
    role: 'user',
    name: '',
    mobile: '',
    profileImage: '',
    profileImageId: '',
    priority: false
  });
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetFormState = () => {
    setFormData({ 
      email: '', 
    //   password: '', 
      role: 'user', 
      name: '', 
      mobile: '',
      profileImage: '',
      profileImageId: '',
      priority: false
    });
    setSelectedImage(null);
    setImagePreview('');
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
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
      
      // Filter only users
      const filteredUsers = response.data.filter(user => user.role === 'user');
      
      setUsers(filteredUsers);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setUsersLoading(false);
    }
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
  
      // Create FormData object for sending to backend
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
    //   formDataToSend.append('password', formData.password);
      formDataToSend.append('role', 'user'); // Always add regular users from this component
      formDataToSend.append('name', formData.name);
      formDataToSend.append('mobile', formData.mobile);
      formDataToSend.append('priority', formData.priority);
      
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
    setFormData({
      email: user.email,
    //   password: '', // Password is not shown in edit mode
      role: user.role,
      name: user.name || '',
      mobile: user.mobile || '',
      profileImage: user.profileImage || '',
      profileImageId: user.profileImageId || '',
      priority: user.priority === true
    });
    
    if (user.profileImage) {
      setImagePreview(user.profileImage);
    } else {
      setImagePreview('');
    }
    
    // Store the user ID for editing
    const userId = user._id || user.id;
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
      
      if (!loggedInUserId || !role) {
        navigate('/');
        return;
      }
      
      if (!editUserId) {
        setError('No user selected for editing. Please try again.');
        setLoading(false);
        return;
      }
  
      // Create FormData object for sending to backend
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('mobile', formData.mobile);
      formDataToSend.append('role', 'user'); // Can only be a user in this component
      formDataToSend.append('priority', formData.priority);
      
      // Append file as 'image' if a new one is selected
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }
  
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'userid': loggedInUserId,
          'role': role
        }
      };
      
      await axios.patch(`http://localhost:5000/api/users/edit/${editUserId}`, formDataToSend, config);
  
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

  // Enhanced loading spinner component
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

  // Enhanced loading placeholder rows for tables
  const renderLoadingRows = () => {
    return (
      <>
        {[1, 2, 3, 4, 5].map((item) => (
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
            <td><div className="loading-cell-content"></div></td>
          </tr>
        ))}
      </>
    );
  };

  const renderRoleOptions = () => {
    return (
      <>
        <option value="user">User</option>
      </>
    );
  };

  return (
    <div className="users-list-container">
      <div className="users-header">
        <h2>Users</h2>
        <button 
          className="add-button"
          onClick={() => {
            setIsEditMode(false);
            resetFormState();
            setShowModal(true);
          }}
        >
          + Add User
        </button>
      </div>
      
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Priority</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              renderLoadingRows()
            ) : error ? (
              <tr>
                <td colSpan="6" className="error-message">{error}</td>
              </tr>
            ) : users.length > 0 ? (
              users.map(user => {
                const userId = user._id || user.id;
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
                      <span className={`priority-badge ${user.priority ? 'high' : 'normal'}`}>
                        {user.priority ? 'High' : 'Normal'}
                      </span>
                    </td>
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
                <td colSpan="6" className="no-results">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserModal
          showModal={showModal}
          isEditMode={isEditMode}
          formData={formData}
          loading={loading}
          error={error}
          imagePreview={imagePreview}
          selectedImage={selectedImage}
          handleInputChange={handleInputChange}
          handleImageChange={handleImageChange}
          handleSubmit={isEditMode ? handleEditUser : handleAddUser}
          closeModal={() => {
            setShowModal(false);
            setIsEditMode(false);
            setEditUserId(null);
            resetFormState();
          }}
          renderRoleOptions={renderRoleOptions}
        />
      )}
    </div>
  );
};

export default UsersList;