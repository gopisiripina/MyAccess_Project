import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import ChangePassword from './components/ChangePassword';
import Dashboard from './components/Dashboard';
import Forgot from './components/Forgot';
import ResetPassword from './components/ResetPassword';

// Protected route component that checks if user is authenticated
const ProtectedRoute = ({ element }) => {
  const isAuthenticated = !!localStorage.getItem('userId');
  
  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // If authenticated, render the element
  return element;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Change password route (semi-protected) */}
        <Route path="/change-password" element={<ChangePassword />} />
        
        {/* Protected dashboard route */}
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute element={<Dashboard />} />} 
        />
        
        {/* Redirect old role-specific routes to unified dashboard */}
        <Route path="/superadmin-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/user-dashboard" element={<Navigate to="/dashboard" replace />} />
        
        {/* Fallback route for any unmatched paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;