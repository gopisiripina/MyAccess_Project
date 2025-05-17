import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WelcomeDashboard = ({ userRole }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');

        if (!userId || !role) return;

        const config = {
          headers: {
            'userid': userId,
            'role': role
          }
        };

        const response = await axios.get(`http://localhost:5000/api/users/${userId}`, config);
        
        if (response.data) {
          if (response.data.profileImage) {
            setProfileImage(response.data.profileImage);
          }
          if (response.data.name) {
            setUserName(response.data.name);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="dashboard-welcome">
      <div className="dashboard-header">
        {profileImage ? (
          <img 
            src={profileImage} 
            alt="User avatar" 
            className="dashboard-avatar"
          />
        ) : (
          <div className="avatar-placeholder">
            {getInitial(userName)}
          </div>
        )}
        <h2>{userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard</h2>
      </div>
      <p>Welcome to your personalized dashboard.</p>
    </div>
  );
};

export default WelcomeDashboard;

