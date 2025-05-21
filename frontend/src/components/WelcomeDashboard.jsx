import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WelcomeDashboard = ({ userRole }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');
        const email = localStorage.getItem('userEmail');
        
        // Set default values and check if we have necessary data
        if (!userId || !role) {
          setLoading(false);
          return;
        }
        
        // Always set the email from localStorage if available
        if (email) {
          setUserEmail(email);
        }
        
        // For guest users, we don't need to make the API call
        if (role === 'guest') {
          // Use email as username for guests
          if (email) {
            setUserName(email.split('@')[0]); // Just use the part before @ for name
          } else {
            setUserName('Guest');
          }
          setLoading(false);
          return;
        }

        // For non-guest users, fetch profile from API
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
          // Only override email from localStorage if API provides one
          if (response.data.email) {
            setUserEmail(response.data.email);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // If there's an error, we'll use the email as fallback for the name
        const email = localStorage.getItem('userEmail');
        if (email) {
          setUserName(email.split('@')[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // Make sure userRole is a string and not undefined before using charAt
  const formattedRole = userRole && typeof userRole === 'string' 
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1) 
    : 'Guest';

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
        <div className="user-info">
          <h2>{formattedRole} Dashboard</h2>
          {/* {userEmail && <p className="user-email">{userEmail}</p>} */}
        </div>
      </div>
      <p>Welcome to your personalized dashboard.</p>
      {loading && <p>Loading your profile information...</p>}
    </div>
  );
};

export default WelcomeDashboard;