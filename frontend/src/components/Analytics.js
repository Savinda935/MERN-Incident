import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../css/Dashboard.css';

const getStoredDate = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored || fallback;
  } catch {
    return fallback;
  }
};

const storeDate = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage issues (e.g. private mode)
  }
};

const categories = [
  'Core Switch (Up Links)',
  'WAN Firewall',
  'Access & Distribution Switches',
  'Advantis Sector Switches',
  'Fabric Sector Switches',
  'Access Points Availability',
  'SAT Sector Switches'
];

const Analytics = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [tooltipInfo, setTooltipInfo] = useState({ visible: false, left: 0, top: 0, planned: 0, unplanned: 0 });

  // Reporting period - explicit date range
  const [reportStartDate, setReportStartDate] = useState(() => {
    const firstOfMonth = new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    return getStoredDate('analyticsStartDate', firstOfMonth);
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getStoredDate('analyticsEndDate', today);
  });

  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api/incidents')
      .then(res => setIncidents(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    storeDate('analyticsStartDate', reportStartDate);
  }, [reportStartDate]);

  useEffect(() => {
    storeDate('analyticsEndDate', reportEndDate);
  }, [reportEndDate]);

  // Validate date range helper
  const isRangeValid = () => {
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    return !(isNaN(start) || isNaN(end) || end < start);
  };

  const metrics = useMemo(() => {
    const periodIncidents = incidents.filter(i => {
      const down = i.downTimeDate ? new Date(i.downTimeDate) : null;
      const up = i.upTimeDate ? new Date(i.upTimeDate) : null;

      if (!down || !up) return false;

      const start = new Date(reportStartDate);
      const end = reportEndDate ? new Date(reportEndDate) : new Date();

      // Only include incidents that intersect with the reporting period
      return (up >= start && down <= end);
    });

    const totalIncidents = periodIncidents.length;
    const planned = periodIncidents.filter(i => i.downType === 'Planned').length;
    const unplanned = periodIncidents.filter(i => i.downType === 'Unplanned').length;

    // Availability per category
    const start = new Date(reportStartDate);
    const end = reportEndDate ? new Date(reportEndDate) : new Date();
    const totalMinutes = (end - start) / (1000 * 60); // total minutes in period

    const availabilityByCategory = categories.map(cat => {
      const incs = periodIncidents.filter(i => i.category === cat);
      let downtime = 0;
      let plannedCount = 0;
      let unplannedCount = 0;
      incs.forEach(i => {
        if (i.downTimeDate && i.upTimeDate && i.downType !== 'Not Down') {
          const down = new Date(i.downTimeDate);
          const up = new Date(i.upTimeDate);
          if (!isNaN(down) && !isNaN(up) && up > down) {
            // Clip downtime to reporting period
            const clippedDown = down < start ? start : down;
            const clippedUp = up > end ? end : up;
            downtime += (clippedUp - clippedDown) / (1000 * 60);
            if (i.downType === 'Planned') plannedCount++;
            else if (i.downType === 'Unplanned') unplannedCount++;
          }
        }
      });
      const avail = totalMinutes > 0 ? ((totalMinutes - downtime) / totalMinutes) * 100 : 100;
      return { 
        category: cat, 
        availability: avail.toFixed(2),
        planned: plannedCount,
        unplanned: unplannedCount
      };
    });

    // Top N uplinks by downtime
    const downtimeBySub = {};
    periodIncidents.forEach(i => {
      if (i.downTimeDate && i.upTimeDate && i.downType !== 'Not Down') {
        const down = new Date(i.downTimeDate);
        const up = new Date(i.upTimeDate);
        if (!isNaN(down) && !isNaN(up) && up > down) {
          const clippedDown = down < start ? start : down;
          const clippedUp = up > end ? end : up;
          const minutes = (clippedUp - clippedDown) / (1000 * 60);
          downtimeBySub[i.subValue] = (downtimeBySub[i.subValue] || 0) + minutes;
        }
      }
    });

    let topDowntime = Object.entries(downtimeBySub)
      .map(([subValue, minutes]) => ({ subValue, minutes: Math.round(minutes) }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      topDowntime = topDowntime.filter(row => row.subValue.toLowerCase().includes(q));
    }

    return { totalIncidents, planned, unplanned, availabilityByCategory, topDowntime };
  }, [incidents, reportStartDate, reportEndDate, searchText]);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card" style={{ overflow: 'visible' }}>
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Date Range</h3>
            <span className="stat-number">{reportStartDate} → {reportEndDate}</span>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="date" 
                value={reportStartDate} 
                onChange={(e) => setReportStartDate(e.target.value)}
                style={{
                  padding: '6px 8px',
                  border: '2px solid #3498db',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#2c3e50',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  minWidth: '110px'
                }}
              />
              <span style={{ color: '#7f8c8d', fontWeight: '600' }}>to</span>
              <input 
                type="date" 
                value={reportEndDate} 
                onChange={(e) => setReportEndDate(e.target.value)}
                style={{
                  padding: '6px 8px',
                  border: '2px solid #3498db',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#2c3e50',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  minWidth: '110px'
                }}
              />
              <button 
                disabled={!isRangeValid()}
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  backgroundColor: isRangeValid() ? '#3498db' : '#bdc3c7',
                  color: '#ffffff',
                  cursor: isRangeValid() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.3s ease'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Incidents</h3>
            <span className="stat-number">{metrics.totalIncidents}</span>
            <span className="stat-change neutral">{metrics.planned} Planned / {metrics.unplanned} Unplanned</span>
          </div>
        </div>

        {metrics.availabilityByCategory.map(item => (
          <div 
            key={item.category} 
            className="stat-card"
            style={{ position: 'relative', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              setHoveredCategory(item.category);
              try {
                const rect = e.currentTarget.getBoundingClientRect();
                const left = rect.left + rect.width / 2 + (window.scrollX || window.pageXOffset || 0);
                const top = rect.top + (window.scrollY || window.pageYOffset || 0);
                setTooltipInfo({ visible: true, left, top, planned: item.planned, unplanned: item.unplanned });
              } catch (err) {
                setTooltipInfo({ visible: true, left: 0, top: 0, planned: item.planned, unplanned: item.unplanned });
              }
            }}
            onMouseLeave={() => {
              setHoveredCategory(null);
              setTooltipInfo(prev => ({ ...prev, visible: false }));
            }}
            onClick={() => {
              // toggle hover state
              const isOpen = hoveredCategory === item.category;
              setHoveredCategory(isOpen ? null : item.category);
              setTooltipInfo(prev => ({ ...prev, visible: !isOpen }));
            }}
          >
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{item.category} Uptime</h3>
              <span className="stat-number success">{item.availability}%</span>
              <span className="stat-change positive">This period</span>
            </div>
          </div>
        ))}

        {/* Portal tooltip rendered at document.body to avoid clipping by header/sidebar */}
        {tooltipInfo.visible && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div
            style={{
              position: 'absolute',
              left: tooltipInfo.left,
              top: tooltipInfo.top,
              transform: 'translate(-50%, -110%)',
              backgroundColor: '#2c3e50',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              zIndex: 99999,
              boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
              border: '2px solid #3498db'
            }}
          >
            📌 Planned: <span style={{ color: '#27ae60' }}>{tooltipInfo.planned}</span> | Unplanned: <span style={{ color: '#e74c3c' }}>{tooltipInfo.unplanned}</span>
          </div>,
          document.body
        )}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Top Uplinks by Downtime</h3>
          </div>
          <div className="card-content">
            <div style={{ marginBottom: 8 }}>
              <input type="text" placeholder="Search uplinks..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            {metrics.topDowntime.length === 0 ? (
              <div className="empty-state">No downtime recorded this period</div>
            ) : (
              <table className="availability-table">
                <thead>
                  <tr>
                    <th>Uplink</th>
                    <th>Downtime (minutes)</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topDowntime.map(row => (
                    <tr key={row.subValue}>
                      <td style={{ color: '#000000' }}>{row.subValue}</td>
                      <td style={{ color: '#000000' }}>{row.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Breakdown by Type</h3>
          </div>
          <div className="card-content">
            <ul className="incidents-list">
              <li className="incident-item">
                <div className="incident-info">
                  <div className="incident-header">
                    <span className="incident-category">Planned</span>
                  </div>
                </div>
                <div className="incident-status status-resolved">{metrics.planned}</div>
              </li>
              <li className="incident-item">
                <div className="incident-info">
                  <div className="incident-header">
                    <span className="incident-category">Unplanned</span>
                  </div>
                </div>
                <div className="incident-status status-active">{metrics.unplanned}</div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
