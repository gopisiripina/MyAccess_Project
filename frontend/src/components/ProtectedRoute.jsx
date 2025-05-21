import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const guestId = localStorage.getItem('guestId');
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return children;
};

export default ProtectedRoute;