import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../css/Dashboard.css';

const categories = ['Core Switch', 'WAN Firewall', 'Access & Distribution Switches', 'Access Points Availability'];

const Analytics = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    axios.get('https://mern-incident-sable.vercel.app/api/incidents')
      .then(res => setIncidents(res.data))
      .finally(() => setLoading(false));
  }, []);

  const monthName = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const [searchText, setSearchText] = useState('');

  const metrics = useMemo(() => {
    const monthFilter = (d) => d && d !== '-' && d.slice(0, 7) === selectedMonth;
    const monthIncidents = incidents.filter(i => monthFilter(i.downTimeDate) || monthFilter(i.upTimeDate));

    const totalIncidents = monthIncidents.length;
    const planned = monthIncidents.filter(i => i.downType === 'Planned').length;
    const unplanned = monthIncidents.filter(i => i.downType === 'Unplanned').length;

    // Availability per category
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const totalMinutes = daysInMonth * 24 * 60;

    const availabilityByCategory = categories.map(cat => {
      const incs = monthIncidents.filter(i => i.category === cat);
      let downtime = 0;
      incs.forEach(i => {
        if (i.downTimeDate && i.upTimeDate && i.downTimeDate !== '-' && i.upTimeDate !== '-' && i.downType !== 'Not Down') {
          const down = new Date(i.downTimeDate);
          const up = new Date(i.upTimeDate);
          if (!isNaN(down) && !isNaN(up) && up > down) downtime += (up - down) / (1000 * 60);
        }
      });
      const avail = totalMinutes > 0 ? ((totalMinutes - downtime) / totalMinutes) * 100 : 100;
      return { category: cat, availability: avail.toFixed(2) };
    });

    // Top N uplinks with downtime
    const downtimeBySub = {};
    monthIncidents.forEach(i => {
      if (i.downTimeDate && i.upTimeDate && i.downTimeDate !== '-' && i.upTimeDate !== '-' && i.downType !== 'Not Down') {
        const down = new Date(i.downTimeDate);
        const up = new Date(i.upTimeDate);
        if (!isNaN(down) && !isNaN(up) && up > down) {
          const minutes = (up - down) / (1000 * 60);
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
  }, [incidents, selectedMonth, searchText]);

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

  const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Selected Month</h3>
            <span className="stat-number">{monthName}</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
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
          <div key={item.category} className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{item.category} Uptime</h3>
              <span className="stat-number success">{item.availability}%</span>
              <span className="stat-change positive">This month</span>
            </div>
          </div>
        ))}
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
              <div className="empty-state">No downtime recorded this month</div>
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
                      <td>{row.subValue}</td>
                      <td>{row.minutes}</td>
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

