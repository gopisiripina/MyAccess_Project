import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

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
        {/* Public route */}
        <Route path="/" element={<LoginPage />} />
        
        {/* Protected dashboard route - same component for all roles */}
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