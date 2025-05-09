// WelcomeDashboard.jsx - Simple welcome component for the dashboard tab
import React from 'react';

const WelcomeDashboard = ({ userRole }) => {
  return (
    <div className="dashboard-welcome">
      <h2>{userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard</h2>
      <p>Welcome to your personalized dashboard.</p>
    </div>
  );
};

export default WelcomeDashboard;