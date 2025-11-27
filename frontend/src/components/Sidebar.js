import React, { useState } from 'react';
import '../css/Sidebar.css'; // Assuming you have a CSS file for styling

const Sidebar = ({ activeMenu, onMenuChange, currentUser, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '📊',
      path: ''
    },
    {
      id: 'add-incident',
      title: 'Add Incident',
      icon: '➕',
      path: '/'
    },
    {
      id: 'view-incidents',
      title: 'View Incidents',
      icon: '📋',
      path: '/view'
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: '📈',
      path: '/reports',
      submenu: [
        { id: 'availability-report', title: 'Availability Report (Chart)', path: '/reports/availability' },
        { id: 'downtime-report', title: 'Downtime Report (Availability)', path: '/reports/downtime' },
        { id: 'monthly-summary', title: 'Monthly Summary', path: '/reports/monthly' }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: '📊',
      path: '/analytics'
    },

    {
      id: 'vcenter/avamar',
      title: 'Vcenter/Avamar',
      icon: '📈',
      path: '/vc_am',
      submenu: [
        { id: 'vcenter-avamar-add', title: 'Add Issues', path: '/vcenter-avamar/add' },
        { id: 'vcenter-avamar-view', title: 'View Issues', path: '/vcenter-avamar/view' },
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: '⚙️',
      path: '/settings',
      submenu: [
        { id: 'user-management', title: 'User Management', path: '/settings/users' },
        { id: 'system-config', title: 'System Config', path: '/settings/system' },
        { id: 'notifications', title: 'Notifications', path: '/settings/notifications' }
      ]
    }
  ];

  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleMenuClick = (item) => {
    if (item.submenu) {
      toggleSubmenu(item.id);
    } else {
      onMenuChange(item.id, item.path);
    }
  };

  const handleSubmenuClick = (parentId, subItem) => {
    onMenuChange(subItem.id, subItem.path);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🖧</span>
          {!isCollapsed && <span className="logo-text">NOC System</span>}
        </div>
        <button 
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? '☰' : '◀'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
                title={isCollapsed ? item.title : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && (
                  <>
                    <span className="nav-text">{item.title}</span>
                    {item.submenu && (
                      <span className={`submenu-arrow ${expandedMenus[item.id] ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    )}
                  </>
                )}
              </button>
              
              {item.submenu && expandedMenus[item.id] && !isCollapsed && (
                <ul className="submenu">
                  {item.submenu.map((subItem) => (
                    <li key={subItem.id} className="submenu-item">
                      <button
                        className={`submenu-link ${activeMenu === subItem.id ? 'active' : ''}`}
                        onClick={() => handleSubmenuClick(item.id, subItem)}
                      >
                        <span className="submenu-text">{subItem.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          {!isCollapsed && (
            <div className="user-details">
              <span className="username">
                {currentUser ? currentUser.username : 'User'}
              </span>
              <span className="user-role">
                {currentUser ? currentUser.email : 'user@example.com'}
              </span>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="system-status">
            <div className="status-indicator">
              <span className="status-dot online"></span>
              <span className="status-text">System Online</span>
            </div>
          </div>
        )}

        <button 
          className="logout-btn"
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
        >
          <span className="logout-icon">🚪</span>
          {!isCollapsed && <span className="logout-text">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;