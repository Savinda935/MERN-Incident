import React, { useState } from 'react';
import Sidebar from './Sidebar';
import AddIncident from './AddIncident';
import ViewIncidents from './ViewIncidents';
import Dashboard from './Dashboard';
import AvailabilityReport from './AvailabilityReport';
import UplinkAvailabilityTable from './UplinkAvailabilityTable';
import '../css/MainLayout.css';

const MainLayout = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleMenuChange = (menuId) => {
    setActiveMenu(menuId);
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
        return  <UplinkAvailabilityTable/>;
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
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="content-header">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => {
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
