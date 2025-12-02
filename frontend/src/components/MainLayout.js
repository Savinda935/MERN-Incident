import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import AddIncident from './AddIncident';
import ViewIncidents from './ViewIncidents';
import Dashboard from './Dashboard';
import AvailabilityReport from './AvailabilityReport';
import UplinkAvailabilityTable from './UplinkAvailabilityTable';
import Analytics from './Analytics';
import AddIssue from './VcenterAvamar/AddIssue';
import ViewIssue from './VcenterAvamar/ViewIssue';
import SectorSummary from './SectorSummary';
import '../css/MainLayout.css';

const MainLayout = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeIncidentsCount, setActiveIncidentsCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [newUpdatesCount, setNewUpdatesCount] = useState(0);
  const [hasNewUpdatesPulse, setHasNewUpdatesPulse] = useState(false);
  const incidentsSignatureRef = useRef('');
  const pulseTimeoutRef = useRef(null);

  const handleMenuChange = (menuId, path) => {
    setActiveMenu(menuId);
  };

  useEffect(() => {
    let mounted = true;

    const loadHeaderStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/incidents');
        const incidents = res.data || [];
        const today = new Date().toISOString().slice(0, 10);
        const active = incidents.filter((incident) => {
          if (!incident.downTimeDate || incident.downTimeDate === '-') return false;
          const downDate = incident.downTimeDate.slice(0, 10);
          return downDate === today && (!incident.upTimeDate || incident.upTimeDate === '-');
        }).length;
        // Compute a lightweight signature of current incidents to detect changes
        const latestTs = incidents.reduce((max, inc) => {
          const tsDown = inc.downTimeDate && inc.downTimeDate !== '-' ? Date.parse(inc.downTimeDate) : 0;
          const tsUp = inc.upTimeDate && inc.upTimeDate !== '-' ? Date.parse(inc.upTimeDate) : 0;
          const ts = Math.max(tsDown || 0, tsUp || 0, inc.id || 0);
          return ts > max ? ts : max;
        }, 0);
        const signature = `${incidents.length}-${latestTs}`;

        if (!mounted) return;
        setActiveIncidentsCount(active);

        // If signature changed (and not the very first run), count as a new update
        if (incidentsSignatureRef.current && incidentsSignatureRef.current !== signature) {
          setNewUpdatesCount(prev => prev + 1);
          setHasNewUpdatesPulse(true);
          if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
          pulseTimeoutRef.current = setTimeout(() => setHasNewUpdatesPulse(false), 8000);
        }
        incidentsSignatureRef.current = signature;

        setNotificationCount(active + newUpdatesCount);
      } catch (e) {
        if (!mounted) return;
        setActiveIncidentsCount(0);
        setNotificationCount(newUpdatesCount);
      }
    };

    loadHeaderStats();
    const interval = setInterval(loadHeaderStats, 15000);
    return () => { mounted = false; clearInterval(interval); if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current); };
  }, [newUpdatesCount]);

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
      case 'sector-summary':
        return <SectorSummary />;
      case 'monthly-summary':
        return <div className="content-placeholder">
          <h2>Monthly Summary</h2>
          <p>Monthly summary report will be displayed here.</p>
        </div>;
      case 'analytics':
        return <Analytics />;
      case 'vcenter-avamar-add':
        return <AddIssue />;
      case 'vcenter-avamar-view':
        return <ViewIssue />;
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
                <span className="stat-value">{activeIncidentsCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">System Health</span>
                <span className="stat-value health-good">98.5%</span>
              </div>
            </div>
            
            <div className="header-actions">
              <button 
                className={`notification-btn${hasNewUpdatesPulse ? ' pulse' : ''}`}
                title="Notifications"
                onClick={() => { setNewUpdatesCount(0); setHasNewUpdatesPulse(false); setNotificationCount(activeIncidentsCount); }}
              >
                🔔
                <span className="notification-badge">{notificationCount}</span>
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
    'sector-summary': 'Sector Summary',
    'monthly-summary': 'Monthly Summary',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'user-management': 'User Management',
    'system-config': 'System Configuration',
    'notifications': 'Notification Settings',
    'vcenter-avamar-add': 'Add Vcenter/Avamar Issue',
    'vcenter-avamar-view': 'View Vcenter/Avamar Issues'
  };
  return titles[menuId] || 'Dashboard';
};

export default MainLayout;
