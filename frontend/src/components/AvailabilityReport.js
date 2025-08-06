import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/AvailabilityReport.css';

function calculateMonthlyAvailability(incidents, category) {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  // Get all Core Switch sub-values from all incidents (not just this month)
  const allCoreSwitchSubValues = Array.from(new Set(
    incidents.filter(i => i.category === category).map(i => i.subValue)
  ));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const results = [];
  
  allCoreSwitchSubValues.forEach(subValue => {
    const totalMinutes = daysInMonth * 24 * 60;
    const subValueIncidents = incidents.filter(inc =>
      inc.category === category &&
      inc.subValue === subValue &&
      inc.downTimeDate &&
      inc.downTimeDate.slice(0, 7) === thisMonth
    );
    
    // If there are no incidents for this month, treat as 100% (Not Down)
    if (subValueIncidents.length === 0) {
      results.push({ subValue, availability: '100.00' });
      return;
    }
    
    // If there are no incidents with both up and down times, treat as 100%
    const hasValidDowntime = subValueIncidents.some(inc =>
      inc.downTimeDate && inc.upTimeDate && inc.downTimeDate !== '-' && inc.upTimeDate !== '-' && inc.downType !== 'Not Down'
    );
    
    if (!hasValidDowntime) {
      results.push({ subValue, availability: '100.00' });
      return;
    }
    
    // Sum downtime for this subValue
    let totalDowntime = 0;
    subValueIncidents.forEach(inc => {
      if (
        inc.downTimeDate &&
        inc.upTimeDate &&
        inc.downTimeDate !== '-' &&
        inc.upTimeDate !== '-' &&
        inc.downType !== 'Not Down'
      ) {
        const down = new Date(inc.downTimeDate);
        const up = new Date(inc.upTimeDate);
        if (!isNaN(down) && !isNaN(up)) {
          const diff = (up - down) / (1000 * 60);
          if (diff > 0) totalDowntime += diff;
        }
      }
    });
    
    const availability = totalMinutes === 0 ? 100 : ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(2);
    results.push({ subValue, availability });
  });
  
  return results;
}

function groupIncidentsByCategoryAndMonth(incidents) {
  const groups = {};
  incidents.forEach(inc => {
    const category = inc.category || 'Unknown';
    const dateStr = inc.downTimeDate && inc.downTimeDate !== '-' ? inc.downTimeDate : inc.upTimeDate;
    if (!dateStr || dateStr === '-') return;
    const month = new Date(dateStr).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groups[category]) groups[category] = {};
    if (!groups[category][month]) groups[category][month] = [];
    groups[category][month].push(inc);
  });
  return groups;
}

// Function to download availability report as CSV
const downloadAvailabilityReport = (allIncidents) => {
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const categories = [
    "Core Switch",
    "WAN Firewall",
    "Access & Distribution Switches"
  ];

  // Create CSV content
  let csvContent = `Network Availability Report - ${monthName}\n\n`;
  
  categories.forEach(category => {
    const availabilitiesForCategory = calculateMonthlyAvailability(allIncidents, category);
    const up100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) === 100);
    const below100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) < 100);
    const total = availabilitiesForCategory.length;
    const up100Percent = total ? ((up100.length / total) * 100).toFixed(0) : 0;
    const below100Percent = total ? ((below100.length / total) * 100).toFixed(0) : 0;

    csvContent += `${category} Summary\n`;
    csvContent += `Total Uplinks,${total}\n`;
    csvContent += `Perfect Uptime (100%),${up100.length} (${up100Percent}%)\n`;
    csvContent += `Had Downtime (< 100%),${below100.length} (${below100Percent}%)\n\n`;

    csvContent += `${category} - Perfect Uptime (100%)\n`;
    csvContent += `Uplink,Uptime\n`;
    up100.forEach(a => {
      csvContent += `${a.subValue},100%\n`;
    });
    csvContent += '\n';

    csvContent += `${category} - Had Downtime (< 100%)\n`;
    csvContent += `Uplink,Uptime\n`;
    below100.forEach(a => {
      csvContent += `${a.subValue},${a.availability}%\n`;
    });
    csvContent += '\n';
  });

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `availability-report-${monthName.replace(' ', '-')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AvailabilityReport = () => {
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allIncidents, setAllIncidents] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/incidents').then(res => {
      setAllIncidents(res.data);
      const data = calculateMonthlyAvailability(res.data, 'Core Switch');
      setAvailabilities(data);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching incidents:', err);
      setLoading(false);
    });
  }, []);

  // 3D Chart with Chart.js
  useEffect(() => {
    if (allIncidents.length === 0) return;
    categories.forEach(category => {
      const availabilitiesForCategory = calculateMonthlyAvailability(allIncidents, category);
      const up100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) === 100);
      const below100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) < 100);
      const canvasId = `availability-chart-${category.replace(/\s/g, '-')}`;
      const ctx = document.getElementById(canvasId);
      if (!ctx) return;

      // Destroy existing chart for this canvas
      if (window[`availabilityChart_${category}`]) {
        window[`availabilityChart_${category}`].destroy();
      }

      // Load Chart.js if not already loaded
      if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
        script.onload = () => createChartForCategory(ctx, up100.length, below100.length, category);
        document.head.appendChild(script);
      } else {
        createChartForCategory(ctx, up100.length, below100.length, category);
      }
    });
  }, [allIncidents]);

  function createChartForCategory(ctx, up100Count, below100Count, category) {
    window[`availabilityChart_${category}`] = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Uptime = 100%', 'Uptime < 100%'],
        datasets: [{
          data: [up100Count, below100Count],
          backgroundColor: [
            'rgba(40, 167, 69, 0.8)',
            'rgba(255, 193, 7, 0.8)'
          ],
          borderColor: [
            'rgba(40, 167, 69, 1)',
            'rgba(255, 193, 7, 1)'
          ],
          borderWidth: 3,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#ffc107',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        elements: { arc: { borderRadius: 8 } },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 2000
        }
      }
    });
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading availability data...</p>
      </div>
    );
  }

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const categories = [
    "Core Switch",
    "WAN Firewall",
    "Access & Distribution Switches"
  ];

  return (
    <div className="availability-dashboard">
      <div className="dashboard-header">
        <h1>Network Availability Report</h1>
        <div className="header-actions">
          <div className="month-indicator">
            <span>{monthName}</span>
          </div>
          <button 
            className="download-btn"
            onClick={() => downloadAvailabilityReport(allIncidents)}
            title="Download Availability Report"
          >
            📥 Download Report
          </button>
        </div>
      </div>
      {categories.map(category => {
        const availabilitiesForCategory = calculateMonthlyAvailability(allIncidents, category);
        const up100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) === 100);
        const below100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) < 100);
        const total = availabilitiesForCategory.length;
        const up100Percent = total ? ((up100.length / total) * 100).toFixed(0) : 0;
        const below100Percent = total ? ((below100.length / total) * 100).toFixed(0) : 0;
        return (
          <div key={category} className="category-report-section" style={{marginBottom: 60}}>
            <h2 style={{color:'#ffc107', marginBottom: 20}}>{category} Availability</h2>
            <div className="dashboard-content">
              <div className="stats-section">
                <div className="stat-cards total-uplinks">
                  <div className="stat-icon">🔗</div>
                  <div className="stat-info">
                    <h3>Total Uplinks</h3>
                    <span className="stat-value">{total}</span>
                  </div>
                </div>
                <div className="stat-cards perfect-uptime">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <h3>Perfect Uptime</h3>
                    <span className="stat-value">{up100.length}</span>
                    <span className="stat-percentage">({up100Percent}%)</span>
                  </div>
                </div>
                <div className="stat-cards downtime-occurred">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-info">
                    <h3>Had Downtime</h3>
                    <span className="stat-value">{below100.length}</span>
                    <span className="stat-percentage">({below100Percent}%)</span>
                  </div>
                </div>
              </div>
              <div className="main-section">
                <div className="chart-section">
                  <div className="chart-container">
                    <h2>{category} Uplink Availability Overview</h2>
                    <div className="chart-wrapper">
                      <canvas id={`availability-chart-${category.replace(/\s/g, '-')}`}></canvas>
                    </div>
                    <div className="chart-legend">
                      <div className="legend-item">
                        <div className="legend-color perfect"></div>
                        <span>Uptime = 100%: {up100Percent}%</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color downtime"></div>
                        <span>Uptime &lt; 100%: {below100Percent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="tables-section">
                  {up100.length > 0 && (
                    <div className="table-container">
                      <h3>Perfect Uptime (100%)</h3>
                      <div className="table-wrapper">
                        <table className="availability-table perfect-table">
                          <thead>
                            <tr>
                              <th>Uplink</th>
                              <th>Uptime</th>
                            </tr>
                          </thead>
                          <tbody>
                            {up100.map(a => (
                              <tr key={a.subValue}>
                                <td>{a.subValue}</td>
                                <td>100%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {below100.length > 0 && (
                    <div className="table-container">
                      <h3>Had Downtime (&lt; 100%)</h3>
                      <div className="table-wrapper">
                        <table className="availability-table downtime-table">
                          <thead>
                            <tr>
                              <th>Uplink</th>
                              <th>Uptime</th>
                            </tr>
                          </thead>
                          <tbody>
                            {below100.map(a => (
                              <tr key={a.subValue}>
                                <td>{a.subValue}</td>
                                <td>{a.availability}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AvailabilityReport;