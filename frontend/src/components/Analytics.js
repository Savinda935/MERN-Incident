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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [modalData, setModalData] = useState({ category: '', planned: [], unplanned: [] });

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
              // open modal showing planned / unplanned incidents for this category
              const start = new Date(reportStartDate);
              const end = reportEndDate ? new Date(reportEndDate) : new Date();
              const filtered = incidents.filter(i => {
                if (i.category !== item.category) return false;
                if (!i.downTimeDate || !i.upTimeDate) return false;
                const down = new Date(i.downTimeDate);
                const up = new Date(i.upTimeDate);
                return (up >= start && down <= end);
              });
              const planned = filtered.filter(i => i.downType === 'Planned');
              const unplanned = filtered.filter(i => i.downType === 'Unplanned');
              setModalData({ category: item.category, planned, unplanned });
              setShowCategoryModal(true);
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
        {/* Category modal: Planned vs Unplanned */}
        {showCategoryModal && typeof document !== 'undefined' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' }}>
            <div style={{ width: '90%', maxWidth: 1100, maxHeight: '85vh', background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 600, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Incidents for {modalData.category}
                </h3>
                <button onClick={() => setShowCategoryModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 20, cursor: 'pointer', width: 36, height: 36, borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, overflow: 'auto', flex: 1 }}>
                <div style={{ border: '1px solid rgba(102, 126, 234, 0.3)', borderRadius: 12, padding: 16, background: 'rgba(102, 126, 234, 0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                  <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: '#667eea', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#667eea' }}></span>
                    Planned
                  </h4>
                  {modalData.planned.length === 0 ? (
                    <div style={{ color: '#888', fontStyle: 'italic', padding: 20, textAlign: 'center' }}>No planned incidents in this period.</div>
                  ) : (
                    <div style={{ maxHeight: 400, overflowY: 'auto', overflowX: 'hidden' }}>
                      <style>{`
                        .modal-scroll::-webkit-scrollbar { width: 8px; }
                        .modal-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
                        .modal-scroll::-webkit-scrollbar-thumb { background: rgba(102, 126, 234, 0.5); border-radius: 4px; }
                        .modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(102, 126, 234, 0.7); }
                      `}</style>
                      <table className="modal-scroll" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'rgba(102, 126, 234, 0.15)', zIndex: 1 }}>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(102, 126, 234, 0.4)', color: '#667eea', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sub-Value</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(102, 126, 234, 0.4)', color: '#667eea', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Down Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalData.planned.map((inc, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '12px', color: '#000', fontSize: 14, fontWeight: 500 }}>{inc.subValue}</td>
                              <td style={{ padding: '12px', color: '#000', fontSize: 13 }}>{new Date(inc.downTimeDate).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: 12, padding: 16, background: 'rgba(244, 67, 54, 0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                  <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: '#f44336', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f44336' }}></span>
                    Unplanned
                  </h4>
                  {modalData.unplanned.length === 0 ? (
                    <div style={{ color: '#888', fontStyle: 'italic', padding: 20, textAlign: 'center' }}>No unplanned incidents in this period.</div>
                  ) : (
                    <div style={{ maxHeight: 400, overflowY: 'auto', overflowX: 'hidden' }}>
                      <style>{`
                        .modal-scroll-unplanned::-webkit-scrollbar { width: 8px; }
                        .modal-scroll-unplanned::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
                        .modal-scroll-unplanned::-webkit-scrollbar-thumb { background: rgba(244, 67, 54, 0.5); border-radius: 4px; }
                        .modal-scroll-unplanned::-webkit-scrollbar-thumb:hover { background: rgba(244, 67, 54, 0.7); }
                      `}</style>
                      <table className="modal-scroll-unplanned" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'rgba(244, 67, 54, 0.15)', zIndex: 1 }}>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(244, 67, 54, 0.4)', color: '#f44336', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sub-Value</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(244, 67, 54, 0.4)', color: '#f44336', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Down Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalData.unplanned.map((inc, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '12px', color: '#000', fontSize: 14, fontWeight: 500 }}>{inc.subValue}</td>
                              <td style={{ padding: '12px', color: '#000', fontSize: 13 }}>{new Date(inc.downTimeDate).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
