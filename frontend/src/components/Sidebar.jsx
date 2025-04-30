import React, { useState } from 'react';
import '../styles/Sidebar.css';

const Sidebar = ({ userRole, activeTab, onTabChange, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getMenuItems = () => {
    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', visible: true },
      { id: 'admins', label: 'Admins', icon: '👑', visible: userRole === 'superadmin' },
      { id: 'users', label: 'Users', icon: '👥', visible: userRole === 'superadmin' || userRole === 'admin' }
    ];
    
    return menuItems.filter(item => item.visible);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      
      <div className="sidebar-header">
        {isSidebarOpen ? (
          <div className="app-logo">
            <div className="logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="app-name">PROJECT</span>
          </div>
        ) : null}
        <button className="toggle-button" onClick={toggleSidebar}>
          {isSidebarOpen ? '◄' : '►'}
        </button>
      </div>

      <div className="sidebar-menu">
        <ul>
          {getMenuItems().map(item => (
            <li key={item.id}>
              <button
                className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onTabChange(item.id)}
              >
                <div className="menu-icon">{item.icon}</div>
                {isSidebarOpen && <div className="menu-label">{item.label}</div>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        {isSidebarOpen && (
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        )}
        {!isSidebarOpen && (
          <button className="logout-button-icon" onClick={onLogout}>
            ⎋
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;