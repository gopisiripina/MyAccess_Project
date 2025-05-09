// Dashboard.jsx - Main component that handles layout and routing
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import WelcomeDashboard from './WelcomeDashboard';
import UsersList from './UsersList';
import AdminsList from './AdminsList';
import ProjectsList from './ProjectsList';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('');
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  useEffect(() => {
    if (urlTab && ['dashboard', 'admins', 'users', 'devices'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

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
      navigate('/dashboard?tab=dashboard');
    }
  }, [activeTab, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/');
  };

  const mainContentClass = `main-content ${!isSidebarOpen ? 'sidebar-closed' : ''}`;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <WelcomeDashboard userRole={userRole} />;
      case 'admins':
        return userRole === 'superadmin' ? <AdminsList /> : <Navigate to="/dashboard?tab=dashboard" />;
      case 'users':
        return (userRole === 'superadmin' || userRole === 'admin') ? <UsersList userRole={userRole} /> : <Navigate to="/dashboard?tab=dashboard" />;
      case 'devices':
        return <ProjectsList userRole={userRole} />;
      default:
        return <WelcomeDashboard userRole={userRole} />;
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
        userRole={userRole} 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        onSidebarToggle={handleSidebarToggle}
        isOpen={isSidebarOpen}
      />
      <div className={mainContentClass}>
        {error && (
          <div className="global-error-message">{error}</div>
        )}
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;