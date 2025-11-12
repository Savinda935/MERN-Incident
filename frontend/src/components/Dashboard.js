import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  const [systemHealth, setSystemHealth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/incidents');
      const incidents = response.data;
      
      // Calculate statistics
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisMonth = now.toISOString().slice(0, 7);
      
      // Total incidents
      const totalIncidents = incidents.length;
      
      // Active incidents (incidents with down time today or unresolved)
      const activeIncidents = incidents.filter(incident => {
        if (!incident.downTimeDate || incident.downTimeDate === '-') return false;
        const downDate = incident.downTimeDate.slice(0, 10);
        return downDate === today;
      }).length;
      
      // Resolved today (incidents with up time today)
      const resolvedToday = incidents.filter(incident => {
        if (!incident.upTimeDate || incident.upTimeDate === '-') return false;
        const upDate = incident.upTimeDate.slice(0, 10);
        return upDate === today;
      }).length;
      
      // Calculate average resolution time
      const resolvedIncidents = incidents.filter(incident => 
        incident.downTimeDate && incident.upTimeDate && 
        incident.downTimeDate !== '-' && incident.upTimeDate !== '-'
      );
      
      let totalResolutionTime = 0;
      resolvedIncidents.forEach(incident => {
        const downTime = new Date(incident.downTimeDate);
        const upTime = new Date(incident.upTimeDate);
        if (!isNaN(downTime) && !isNaN(upTime)) {
          totalResolutionTime += (upTime - downTime) / (1000 * 60); // in minutes
        }
      });
      
      const avgMinutes = resolvedIncidents.length > 0 ? totalResolutionTime / resolvedIncidents.length : 0;
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = Math.floor(avgMinutes % 60);
      const averageResolutionTime = `${avgHours}h ${avgMins}m`;
      
      // Calculate system availability
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const totalMinutes = daysInMonth * 24 * 60;
      let totalDowntime = 0;
      
      incidents.forEach(incident => {
        if (incident.downTimeDate && incident.upTimeDate && 
            incident.downTimeDate !== '-' && incident.upTimeDate !== '-' &&
            incident.downType !== 'Not Down' &&
            incident.downTimeDate.slice(0, 7) === thisMonth) {
          const downTime = new Date(incident.downTimeDate);
          const upTime = new Date(incident.upTimeDate);
          if (!isNaN(downTime) && !isNaN(upTime)) {
            const downtimeMinutes = (upTime - downTime) / (1000 * 60);
            if (downtimeMinutes > 0) totalDowntime += downtimeMinutes;
          }
        }
      });
      
      const availability = totalMinutes > 0 ? ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(1) : 100;
      const systemAvailability = `${availability}%`;
      
      // Critical alerts (incidents with downtime today)
      const criticalAlerts = activeIncidents;
      
      setStats({
        totalIncidents,
        activeIncidents,
        resolvedToday,
        averageResolutionTime,
        systemAvailability,
        criticalAlerts
      });
      
      // Recent incidents (last 5 incidents)
      const recent = incidents
        .sort((a, b) => new Date(b.downTimeDate || b.upTimeDate) - new Date(a.downTimeDate || a.upTimeDate))
        .slice(0, 5)
        .map(incident => ({
          id: incident.id,
          category: incident.category,
          subValue: incident.subValue,
          time: formatTime(incident.downTimeDate || incident.upTimeDate),
          status: getIncidentStatus(incident),
          priority: getIncidentPriority(incident)
        }));
      
      setRecentIncidents(recent);
      
      // System health by category
      const categories = ['Core Switch', 'WAN Firewall', 'Access & Distribution Switches', 'Access Points Availability'];
      const healthData = categories.map(category => {
        const categoryIncidents = incidents.filter(inc => inc.category === category);
        const categoryAvailability = calculateCategoryAvailability(categoryIncidents, thisMonth);
        return {
          name: category,
          status: categoryAvailability >= 99 ? 'online' : categoryAvailability >= 95 ? 'warning' : 'critical',
          uptime: `${categoryAvailability.toFixed(1)}%`
        };
      });
      
      setSystemHealth(healthData);
      setLoading(false);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString || dateString === '-') return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return 'N/A';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getIncidentStatus = (incident) => {
    if (!incident.downTimeDate || incident.downTimeDate === '-') return 'pending';
    if (!incident.upTimeDate || incident.upTimeDate === '-') return 'active';
    return 'resolved';
  };

  const getIncidentPriority = (incident) => {
    if (incident.downType === 'Unplanned') return 'high';
    if (incident.downType === 'Planned') return 'medium';
    return 'low';
  };

  const calculateCategoryAvailability = (incidents, month) => {
    const daysInMonth = new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 0).getDate();
    const totalMinutes = daysInMonth * 24 * 60;
    let totalDowntime = 0;
    
    incidents.forEach(incident => {
      if (incident.downTimeDate && incident.upTimeDate && 
          incident.downTimeDate !== '-' && incident.upTimeDate !== '-' &&
          incident.downType !== 'Not Down' &&
          incident.downTimeDate.slice(0, 7) === month) {
        const downTime = new Date(incident.downTimeDate);
        const upTime = new Date(incident.upTimeDate);
        if (!isNaN(downTime) && !isNaN(upTime)) {
          const downtimeMinutes = (upTime - downTime) / (1000 * 60);
          if (downtimeMinutes > 0) totalDowntime += downtimeMinutes;
        }
      }
    });
    
    return totalMinutes > 0 ? ((totalMinutes - totalDowntime) / totalMinutes * 100) : 100;
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

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Incidents</h3>
            <span className="stat-number">{stats.totalIncidents}</span>
            <span className="stat-change positive">All time</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Active Incidents</h3>
            <span className="stat-number critical">{stats.activeIncidents}</span>
            <span className="stat-change neutral">Today</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Resolved Today</h3>
            <span className="stat-number">{stats.resolvedToday}</span>
            <span className="stat-change positive">Today</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>Avg Resolution Time</h3>
            <span className="stat-number">{stats.averageResolutionTime}</span>
            <span className="stat-change neutral">Average</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>System Availability</h3>
            <span className="stat-number success">{stats.systemAvailability}</span>
            <span className="stat-change positive">This month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <h3>Critical Alerts</h3>
            <span className="stat-number warning">{stats.criticalAlerts}</span>
            <span className="stat-change neutral">Active</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Incidents */}
        <div className="dashboard-card recent-incidents">
          <div className="card-header">
            <h3>Recent Incidents</h3>
            <button className="view-all-btn" onClick={() => window.location.href = '/view-incidents'}>View All</button>
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
              <button className="action-btn primary" onClick={() => window.location.href = '/add-incident'}>
                <span className="action-icon">➕</span>
                <span>Add Incident</span>
              </button>
              <button className="action-btn secondary" onClick={() => window.location.href = '/availability-report'}>
                <span className="action-icon">📋</span>
                <span>View Reports</span>
              </button>
              <button className="action-btn secondary" onClick={() => window.location.href = '/view-incidents'}>
                <span className="action-icon">📊</span>
                <span>View Incidents</span>
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
            <span className="alert-count">{stats.criticalAlerts} Active</span>
          </div>
          <div className="card-content">
            {stats.criticalAlerts > 0 ? (
              <div className="alert-item high">
                <div className="alert-icon">⚠️</div>
                <div className="alert-content">
                  <div className="alert-title">Active Incidents Detected</div>
                  <div className="alert-description">{stats.activeIncidents} incidents currently active</div>
                  <div className="alert-time">Today</div>
                </div>
                <button className="alert-action" onClick={() => window.location.href = '/view-incidents'}>View Details</button>
              </div>
            ) : (
              <div className="empty-state">
                <span>No active alerts</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;