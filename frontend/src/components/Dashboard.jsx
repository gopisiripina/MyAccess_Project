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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  }, [activeTab, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const response = await axios.get('http://localhost:5000/api/users/', config);
      
      let filteredUsers = response.data;
      if (activeTab === 'admins') {
        filteredUsers = response.data.filter(user => user.role === 'admin');
      } else if (activeTab === 'users') {
        filteredUsers = response.data.filter(user => user.role === 'user');
      }
      
      setUsers(filteredUsers);
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
      
      let roleToAdd = formData.role;
      if (userRole === 'admin') {
        roleToAdd = 'user';
      } else if (userRole === 'superadmin' && activeTab === 'admins') {
        roleToAdd = 'admin';
      }
      
      const userData = {
        email: formData.email,
        password: formData.password,
        role: roleToAdd,
        currentRole: userRole
      };
      
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      await axios.post('http://localhost:5000/api/users/add', userData, config);
      
      setFormData({ email: '', password: '', role: 'user' });
      setShowModal(false);
      fetchUsers();
      
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.response?.data?.message || 'Failed to add user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`http://localhost:5000/api/users/delete/${userId}`);
        fetchUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Failed to delete user.');
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
        <h2>Welcome {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</h2>
        <p>This is your personalized dashboard.</p>
      </div>
    );
  };

  const renderUsersList = (title, isAdminsList = false) => {
    return (
      <div className="users-list-container">
        <div className="users-header">
          <h2>{title}</h2>
          <button 
            className="add-button"
            onClick={() => setShowModal(true)}
          >
            + Add {isAdminsList ? 'Admin' : 'User'}
          </button>
        </div>
        
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">No {isAdminsList ? 'admins' : 'users'} found</td>
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

    let modalTitle = 'Add User';
    let showRoleSelect = false;

    if (userRole === 'superadmin') {
      modalTitle = activeTab === 'admins' ? 'Add Admin' : 'Add User';
      showRoleSelect = true;
    }

    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>{modalTitle}</h3>
            <button className="close-button" onClick={() => setShowModal(false)}>×</button>
          </div>
          <form onSubmit={handleAddUser}>
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
            {showRoleSelect && (
              <div className="form-group">
                <select
                  id="role"
                  name="role"
                  value={activeTab === 'admins' ? 'admin' : formData.role}
                  onChange={handleInputChange}
                  disabled={activeTab === 'admins'}
                >
                  {activeTab === 'admins' ? (
                    <option value="admin">Admin</option>
                  ) : (
                    <option value="user">User</option>
                  )}
                </select>
              </div>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
        userRole={userRole} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      <div className="main-content">
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
      {renderModal()}
    </div>
  );
};

export default Dashboard;