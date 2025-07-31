import React, { useState, useEffect } from 'react';
import { logout, getUser } from '../utils/auth';
import Sidebar from './Sidebar';
import AddIncident from './AddIncident';
import ViewIncidents from './ViewIncidents';
import Dashboard from './Dashboard';
import AvailabilityReport from './AvailabilityReport';
import '../css/MainLayout.css'; // Assuming you have a CSS file for styling

const MainLayout = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
  }, []);

  const handleMenuChange = (menuId, path) => {
    setActiveMenu(menuId);
    // Here you would typically handle routing
    // For now, we'll just update the active menu
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-incident':
        return <AddIncident />;
      case 'view-incidents':
        return <ViewIncidents />;
      case 'reports':
        return <div className="content-placeholder">
          <h2>Reports</h2>
          <p>Reports functionality will be implemented here.</p>
        </div>;
      case 'availability-report':
        return <AvailabilityReport />;
      case 'downtime-report':
        return <div className="content-placeholder">
          <h2>Downtime Report</h2>
          <p>Downtime report details will be shown here.</p>
        </div>;
      case 'monthly-summary':
        return <div className="content-placeholder">
          <h2>Monthly Summary</h2>
          <p>Monthly summary report will be displayed here.</p>
        </div>;
      case 'analytics':
        return <div className="content-placeholder">
          <h2>Analytics</h2>
          <p>Analytics dashboard will be implemented here.</p>
        </div>;
      case 'settings':
        return <div className="content-placeholder">
          <h2>Settings</h2>
          <p>System settings will be available here.</p>
        </div>;
      case 'user-management':
        return <div className="content-placeholder">
          <h2>User Management</h2>
          <p>User management interface will be implemented here.</p>
        </div>;
      case 'system-config':
        return <div className="content-placeholder">
          <h2>System Configuration</h2>
          <p>System configuration options will be available here.</p>
        </div>;
      case 'notifications':
        return <div className="content-placeholder">
          <h2>Notification Settings</h2>
          <p>Notification preferences will be managed here.</p>
        </div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="main-layout">
      <Sidebar 
        activeMenu={activeMenu} 
        onMenuChange={handleMenuChange}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="content-header">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => {
                // Toggle mobile sidebar
                document.querySelector('.sidebar').classList.toggle('mobile-open');
              }}
            >
              ☰
            </button>
            <h1 className="page-title">
              {getPageTitle(activeMenu)}
            </h1>
          </div>
          
          <div className="header-right">
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-label">Active Incidents</span>
                <span className="stat-value">3</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">System Health</span>
                <span className="stat-value health-good">98.5%</span>
              </div>
            </div>
            
            <div className="header-actions">
              <button className="notification-btn" title="Notifications">
                🔔
                <span className="notification-badge">2</span>
              </button>
              
              <div className="user-menu">
                <button 
                  className="user-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <span className="user-avatar">👤</span>
                  <span className="user-name">
                    {currentUser ? currentUser.username : 'User'}
                  </span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-info">
                      <span className="user-full-name">
                        {currentUser ? currentUser.username : 'User'}
                      </span>
                      <span className="user-email">
                        {currentUser ? currentUser.email : 'user@example.com'}
                      </span>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <span className="dropdown-icon">👤</span>
                      Profile
                    </button>
                    <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <span className="dropdown-icon">⚙️</span>
                      Settings
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item logout-item" onClick={handleLogout}>
                      <span className="dropdown-icon">🚪</span>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="content-body">
          {renderContent()}
        </main>
        
        <footer className="content-footer">
          <div className="footer-content">
            <span>© 2025 NOC Incident Management System</span>
            <span>Last Updated: {new Date().toLocaleString()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

const getPageTitle = (menuId) => {
  const titles = {
    'dashboard': 'Dashboard',
    'add-incident': 'Add New Incident',
    'view-incidents': 'View Incidents',
    'reports': 'Reports',
    'availability-report': 'Availability Report',
    'downtime-report': 'Downtime Report',
    'monthly-summary': 'Monthly Summary',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'user-management': 'User Management',
    'system-config': 'System Configuration',
    'notifications': 'Notification Settings'
  };
  return titles[menuId] || 'Dashboard';
};

export default MainLayout;