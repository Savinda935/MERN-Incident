import React, { useState, useEffect } from 'react';
import '../css/Dashboard.css'; // Assuming you have a CSS file for styling

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    resolvedToday: 0,
    averageResolutionTime: '0h 0m',
    systemAvailability: '99.9%',
    criticalAlerts: 0
  });

  const [recentIncidents, setRecentIncidents] = useState([]);
  const [systemHealth, setSystemHealth] = useState([
    { name: 'Core Switch', status: 'online', uptime: '99.8%' },
    { name: 'WAN Firewall', status: 'online', uptime: '99.9%' },
    { name: 'Access Switches', status: 'warning', uptime: '98.5%' },
    { name: 'Distribution Switches', status: 'online', uptime: '99.7%' }
  ]);

  useEffect(() => {
    // Simulate loading dashboard data
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    // In a real application, this would fetch data from your API
    setStats({
      totalIncidents: 127,
      activeIncidents: 3,
      resolvedToday: 8,
      averageResolutionTime: '2h 15m',
      systemAvailability: '99.2%',
      criticalAlerts: 1
    });

    setRecentIncidents([
      {
        id: 1,
        category: 'Core Switch',
        subValue: 'Switch-01',
        time: '10:30 AM',
        status: 'active',
        priority: 'high'
      },
      {
        id: 2,
        category: 'WAN Firewall',
        subValue: 'FW-Main',
        time: '09:45 AM',
        status: 'resolved',
        priority: 'medium'
      },
      {
        id: 3,
        category: 'Access & Distribution Switches',
        subValue: 'Access-12',
        time: '08:20 AM',
        status: 'resolved',
        priority: 'low'
      }
    ]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      case 'offline': return '⚫';
      default: return '🟢';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'resolved': return 'status-resolved';
      case 'pending': return 'status-pending';
      default: return 'status-pending';
    }
  };

  return (
    <div className="dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Incidents</h3>
            <span className="stat-number">{stats.totalIncidents}</span>
            <span className="stat-change positive">+12% this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Active Incidents</h3>
            <span className="stat-number critical">{stats.activeIncidents}</span>
            <span className="stat-change negative">-1 from yesterday</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Resolved Today</h3>
            <span className="stat-number">{stats.resolvedToday}</span>
            <span className="stat-change positive">+3 from yesterday</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>Avg Resolution Time</h3>
            <span className="stat-number">{stats.averageResolutionTime}</span>
            <span className="stat-change positive">-15% improvement</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>System Availability</h3>
            <span className="stat-number success">{stats.systemAvailability}</span>
            <span className="stat-change positive">+0.1% this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <h3>Critical Alerts</h3>
            <span className="stat-number warning">{stats.criticalAlerts}</span>
            <span className="stat-change neutral">No change</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Incidents */}
        <div className="dashboard-card recent-incidents">
          <div className="card-header">
            <h3>Recent Incidents</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="card-content">
            {recentIncidents.length > 0 ? (
              <div className="incidents-list">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="incident-item">
                    <div className="incident-info">
                      <div className="incident-header">
                        <span className="incident-category">{incident.category}</span>
                        <span className={`incident-priority ${getPriorityClass(incident.priority)}`}>
                          {incident.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="incident-details">
                        <span className="incident-subvalue">{incident.subValue}</span>
                        <span className="incident-time">{incident.time}</span>
                      </div>
                    </div>
                    <div className={`incident-status ${getStatusClass(incident.status)}`}>
                      {incident.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>No recent incidents</span>
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="dashboard-card system-health">
          <div className="card-header">
            <h3>System Health</h3>
            <div className="health-summary">
              <span className="health-indicator good">●</span>
              <span>All Systems Operational</span>
            </div>
          </div>
          <div className="card-content">
            <div className="health-list">
              {systemHealth.map((system, index) => (
                <div key={index} className="health-item">
                  <div className="health-info">
                    <span className="health-icon">{getStatusIcon(system.status)}</span>
                    <span className="health-name">{system.name}</span>
                  </div>
                  <div className="health-metrics">
                    <span className="uptime">{system.uptime}</span>
                    <span className={`status-badge ${system.status}`}>
                      {system.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="actions-grid">
              <button className="action-btn primary">
                <span className="action-icon">➕</span>
                <span>Add Incident</span>
              </button>
              <button className="action-btn secondary">
                <span className="action-icon">📋</span>
                <span>View Reports</span>
              </button>
              <button className="action-btn secondary">
                <span className="action-icon">📊</span>
                <span>Analytics</span>
              </button>
              <button className="action-btn secondary">
                <span className="action-icon">⚙️</span>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="dashboard-card system-alerts">
          <div className="card-header">
            <h3>System Alerts</h3>
            <span className="alert-count">1 Active</span>
          </div>
          <div className="card-content">
            <div className="alert-item high">
              <div className="alert-icon">⚠️</div>
              <div className="alert-content">
                <div className="alert-title">High CPU Usage Detected</div>
                <div className="alert-description">Access-12 switch showing 85% CPU utilization</div>
                <div className="alert-time">2 minutes ago</div>
              </div>
              <button className="alert-action">Acknowledge</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;