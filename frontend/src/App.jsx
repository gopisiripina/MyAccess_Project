import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import ChangePassword from './components/ChangePassword';
import Dashboard from './components/Dashboard';
import Forgot from './components/Forgot';
import ResetPassword from './components/ResetPassword';
import ProjectDashboard from './components/ProjectDashboard';
import AddProject from './components/AddProject';
import GuestLoginPage from "./components/GuestLoginPage"


// Protected route component that checks if user is authenticated
const ProtectedRoute = ({ element }) => {
  const isAuthenticated = !!localStorage.getItem('userId');
  
  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/"  state={{ from: window.location.pathname }} replace />;
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
          
          {/* Change password route */}
          <Route path="/change-password" element={<ChangePassword />} />
          
          {/* Main protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />}>
            <Route index element={<Navigate to="/dashboard?tab=dashboard" replace />} />
            <Route path="projects" element={<Navigate to="/dashboard?tab=devices" replace />} />
          </Route>
  
          {/* Project routes */}
          <Route path="/project/:projectId" element={<ProtectedRoute element={<ProjectDashboard />} />}/>
          <Route path="/projects/add" element={<ProtectedRoute element={<AddProject />} />}/>
          
          {/* Redirects */}
          <Route path="/superadmin-dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin-dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/user-dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/projects" element={<Navigate to="/dashboard?tab=devices" replace />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          // Add this new route to your existing routes
          <Route path="/guest-login" element={<GuestLoginPage />} />
          {/* <Route path="/guest-view" element={<GuestProjectCard />} /> */}
          // Add this new route to your existing routes

        </Routes>
      </Router>
    );
  }

export default App;