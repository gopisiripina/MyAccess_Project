import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminsList = () => {
  const [admins, setAdmins] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    // password: '',
    role: 'admin',
    name: '',
    mobile: '',
    profileImage: '',
    profileImageId: ''
  });
  const [loading, setLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const resetFormState = () => {
    setFormData({ 
      email: '', 
    //   password: '', 
      role: 'admin', 
      name: '', 
      mobile: '',
      profileImage: '',
      profileImageId: ''
    });
    setSelectedImage(null);
    setImagePreview('');
  };

  const fetchAdmins = async () => {
    try {
      setAdminsLoading(true);
      const loggedInUserId = localStorage.getItem('userId');
      const role = localStorage.getItem('userRole');
      
      if (!loggedInUserId || !role) {
        navigate('/');
        return;
      }

      if (role !== 'superadmin') {
        navigate('/dashboard?tab=dashboard');
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
      
      // Filter only admins
      const filteredAdmins = response.data.filter(user => user.role === 'admin');
      
      setAdmins(filteredAdmins);
      setError('');
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError('Failed to fetch admins. Please try again.');
    } finally {
      setAdminsLoading(false);
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

  const handleAddAdmin = async (e) => {
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
  
      if (role !== 'superadmin') {
        setError('Only superadmins can add new admins');
        setLoading(false);
        return;
      }
  
      // Create FormData object for sending to backend
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
    //   formDataToSend.append('password', formData.password);
      formDataToSend.append('role', 'admin'); // Always set role to admin in this component
      formDataToSend.append('name', formData.name);
      formDataToSend.append('mobile', formData.mobile);
      
      // Append file as 'image' if one is selected
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
  
      await axios.post('http://localhost:5000/api/users/add', formDataToSend, config);
  
      resetFormState();
      setShowModal(false);
      fetchAdmins();
  
    } catch (err) {
      console.error('Error adding admin:', err);
      setError(err.response?.data?.message || 'Failed to add admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (admin) => {
    setFormData({
      email: admin.email,
    //   password: '', // Password is not shown in edit mode
      role: admin.role,
      name: admin.name || '',
      mobile: admin.mobile || '',
      profileImage: admin.profileImage || '',
      profileImageId: admin.profileImageId || ''
    });
    
    if (admin.profileImage) {
      setImagePreview(admin.profileImage);
    } else {
      setImagePreview('');
    }
    
    // Store the admin ID for editing
    const adminId = admin._id || admin.id;
    setEditUserId(adminId);
    setIsEditMode(true);
    setShowModal(true);
  };
  
  const handleEditAdmin = async (e) => {
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
      
      if (role !== 'superadmin') {
        setError('Only superadmins can edit admins');
        setLoading(false);
        return;
      }
      
      if (!editUserId) {
        setError('No admin selected for editing. Please try again.');
        setLoading(false);
        return;
      }
  
      // Create FormData object for sending to backend
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('mobile', formData.mobile);
      formDataToSend.append('role', formData.role); // Allow role selection in edit mode
      
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
      fetchAdmins();
  
    } catch (err) {
      console.error('Error editing admin:', err);
      setError(err.response?.data?.message || 'Failed to edit admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAdmin = async (adminIdToDelete) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      try {
        const loggedInUserId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');
  
        if (!loggedInUserId || !role) {
          navigate('/');
          return;
        }
        
        if (role !== 'superadmin') {
          setError('Only superadmins can delete admins');
          return;
        }
  
        const config = {
          headers: {
            'userid': loggedInUserId,
            'role': role
          }
        };
  
        await axios.delete(`http://localhost:5000/api/users/delete/${adminIdToDelete}`, config);
        fetchAdmins();
      } catch (err) {
        console.error('Error deleting admin:', err);
        setError('Failed to delete admin. Please try again.');
      }
    }
  };

  // Render role options based on user role and context
  const renderRoleOptions = () => {
    // For superadmin editing an admin, they can choose between admin and regular user
    return (
      <>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </>
    );
  };

  const renderAdminAvatar = (admin) => {
    if (admin.profileImage) {
      return (
        <img 
          src={admin.profileImage} 
          alt={`${admin.name || 'Admin'}'s avatar`} 
          className="user-avatar" 
        />
      );
    } else {
      // Default avatar with admin's initials
      const initials = admin.name 
        ? admin.name.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2)
        : admin.email.substring(0, 2).toUpperCase();
      
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
        <div className="loading-text loading-pulse">Loading admins...</div>
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
          </tr>
        ))}
      </>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    const modalTitle = isEditMode ? 'Edit Admin' : 'Add Admin';

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
          <form onSubmit={isEditMode ? handleEditAdmin : handleAddAdmin}>
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

            {isEditMode && (
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

  return (
    <div className="users-list-container">
      <div className="users-header">
        <h2>Admins</h2>
        <button 
          className="add-button"
          onClick={() => {
            setIsEditMode(false);
            resetFormState();
            setShowModal(true);
          }}
        >
          + Add Admin
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminsLoading ? (
              renderLoadingRows()
            ) : error ? (
              <tr>
                <td colSpan="5" className="error-message">{error}</td>
              </tr>
            ) : admins.length > 0 ? (
              admins.map(admin => {
                const adminId = admin._id || admin.id; // Handle both MongoDB and Firestore ID formats
                return (
                  <tr key={adminId}>
                    <td>
                      <div className="user-name-cell">
                        {renderAdminAvatar(admin)}
                        <span className="user-name">{admin.name || '-'}</span>
                      </div>
                    </td>
                    <td>{admin.email}</td>
                    <td>{admin.mobile || '-'}</td>
                    <td>{admin.role}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-button"
                          onClick={() => handleEditClick(admin)}
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteAdmin(adminId)}
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
                <td colSpan="5" className="no-results">No admins found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {renderModal()}
    </div>
  );
};

export default AdminsList;