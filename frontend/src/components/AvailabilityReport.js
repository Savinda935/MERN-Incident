import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/AvailabilityReport.css';

function incidentIntersectsPeriod(inc, start, end) {
  const down = inc.downTimeDate ? new Date(inc.downTimeDate) : null;
  const up = inc.upTimeDate ? new Date(inc.upTimeDate) : null;
  if (!down || !up) return false;
  return up >= start && down <= end;
}

function clipDowntimeMinutes(down, up, start, end) {
  const clippedDown = down < start ? start : down;
  const clippedUp = up > end ? end : up;
  return Math.max(0, (clippedUp - clippedDown) / (1000 * 60));
}

function calculateRangeAvailability(incidents, category, startDateStr, endDateStr) {
  // Get all sub-values for the category from all incidents
  const allCoreSwitchSubValues = Array.from(new Set(
    incidents.filter(i => i.category === category).map(i => i.subValue)
  ));
  const results = [];

  const periodStart = new Date(`${startDateStr}T00:00:00`);
  const periodEnd = new Date(`${endDateStr}T23:59:59`);
  const totalMinutes = Math.max(0, (periodEnd - periodStart) / (1000 * 60));
  
  allCoreSwitchSubValues.forEach(subValue => {
    const subValueIncidents = incidents.filter(inc =>
      inc.category === category &&
      inc.subValue === subValue &&
      inc.downTimeDate && inc.upTimeDate &&
      incidentIntersectsPeriod(inc, periodStart, periodEnd)
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
          const minutes = clipDowntimeMinutes(down, up, periodStart, periodEnd);
          if (minutes > 0) totalDowntime += minutes;
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

// Function to download chart as image
const downloadChartAsImage = (category) => {
  const canvasId = `availability-chart-${category.replace(/\s/g, '-')}`;
  const canvas = document.getElementById(canvasId);
  
  if (canvas) {
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.download = `${category.replace(/\s/g, '-')}-availability-chart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
};

// Function to download comprehensive chart with tables
const downloadComprehensiveChart = (category, up100, below100, up100Percent, below100Percent) => {
  const canvasId = `comprehensive-chart-${category.replace(/\s/g, '-')}`;
  let canvas = document.getElementById(canvasId);
  
  // Create canvas if it doesn't exist
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.position = 'absolute';
    canvas.style.left = '-9999px';
    document.body.appendChild(canvas);
  }
  
  const ctx = canvas.getContext('2d');
  const width = 1200;
  const height = 800;
  canvas.width = width;
  canvas.height = height;
  
  // Set background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);
  
  // Title
  ctx.fillStyle = '#ffc107';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${category} Uplink Availability Overview`, width / 2, 40);
  
  // Create donut chart
  const centerX = 300;
  const centerY = 200;
  const radius = 120;
  const innerRadius = 80;
  
  // Draw donut chart
  const total = up100.length + below100.length;
  let currentAngle = -Math.PI / 2;
  
  // Perfect uptime segment (green)
  const up100Angle = (up100.length / total) * 2 * Math.PI;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + up100Angle);
  ctx.arc(centerX, centerY, innerRadius, currentAngle + up100Angle, currentAngle, true);
  ctx.closePath();
  ctx.fillStyle = 'rgba(40, 167, 69, 0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 167, 69, 1)';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Downtime segment (yellow)
  currentAngle += up100Angle;
  const below100Angle = (below100.length / total) * 2 * Math.PI;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + below100Angle);
  ctx.arc(centerX, centerY, innerRadius, currentAngle + below100Angle, currentAngle, true);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 193, 7, 1)';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Center text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${total}`, centerX, centerY - 10);
  ctx.font = '16px Arial';
  ctx.fillText('Total Uplinks', centerX, centerY + 15);
  
  // Legend
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Legend:', 50, 350);
  
  // Perfect uptime legend
  ctx.fillStyle = 'rgba(40, 167, 69, 0.8)';
  ctx.fillRect(50, 370, 20, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText(`Uptime = 100%: ${up100Percent}%`, 80, 385);
  
  // Downtime legend
  ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
  ctx.fillRect(50, 400, 20, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Uptime < 100%: ${below100Percent}%`, 80, 415);
  
  // Tables section
  const tableStartX = 600;
  const tableStartY = 100;
  const colWidth = 200;
  const rowHeight = 30;
  
  // Perfect Uptime Table
  ctx.fillStyle = '#ffc107';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Perfect Uptime (100%)', tableStartX, tableStartY);
  
  // Table header
  ctx.fillStyle = '#444';
  ctx.fillRect(tableStartX, tableStartY + 10, colWidth * 2, rowHeight);
  ctx.fillStyle = '#ffc107';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Uplink', tableStartX + 10, tableStartY + 30);
  ctx.fillText('Uptime', tableStartX + colWidth + 10, tableStartY + 30);
  
  // Table rows
  up100.slice(0, 8).forEach((item, index) => {
    const y = tableStartY + 40 + (index * rowHeight);
    ctx.fillStyle = index % 2 === 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(40, 167, 69, 0.05)';
    ctx.fillRect(tableStartX, y, colWidth * 2, rowHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(item.subValue, tableStartX + 10, y + 20);
    ctx.fillText('100%', tableStartX + colWidth + 10, y + 20);
  });
  
  // Had Downtime Table
  const downtimeTableY = tableStartY + 300;
  ctx.fillStyle = '#ffc107';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Had Downtime (< 100%)', tableStartX, downtimeTableY);
  
  // Table header
  ctx.fillStyle = '#444';
  ctx.fillRect(tableStartX, downtimeTableY + 10, colWidth * 2, rowHeight);
  ctx.fillStyle = '#ffc107';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Uplink', tableStartX + 10, downtimeTableY + 30);
  ctx.fillText('Uptime', tableStartX + colWidth + 10, downtimeTableY + 30);
  
  // Table rows
  below100.slice(0, 8).forEach((item, index) => {
    const y = downtimeTableY + 40 + (index * rowHeight);
    ctx.fillStyle = index % 2 === 0 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.05)';
    ctx.fillRect(tableStartX, y, colWidth * 2, rowHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(item.subValue, tableStartX + 10, y + 20);
    ctx.fillText(`${item.availability}%`, tableStartX + colWidth + 10, y + 20);
  });
  
  // Download the image
  const link = document.createElement('a');
  link.download = `${category.replace(/\s/g, '-')}-comprehensive-chart.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  // Clean up
  document.body.removeChild(canvas);
};

// Function to download availability report as CSV
const downloadAvailabilityReport = (allIncidents, startDateStr, endDateStr) => {
  const categories = [
    "Core Switch",
    "WAN Firewall",
    "Access & Distribution Switches",
    "Access Points Availability"
  ];

  // Create CSV content
  let csvContent = `Network Availability Report - ${startDateStr} to ${endDateStr}\n\n`;
  
  categories.forEach(category => {
    const availabilitiesForCategory = calculateRangeAvailability(allIncidents, category, startDateStr, endDateStr);
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
  link.setAttribute('download', `availability-report-${startDateStr}-to-${endDateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function ensureChartJsLoaded(callback) {
  if (window.Chart) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
  script.onload = callback;
  document.head.appendChild(script);
}

const AvailabilityReport = () => {
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allIncidents, setAllIncidents] = useState([]);
  const [startDate, setStartDate] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    axios.get('http://localhost:5000/api/incidents').then(res => {
      setAllIncidents(res.data);
      const data = calculateRangeAvailability(res.data, 'Core Switch', startDate, endDate);
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
      const availabilitiesForCategory = calculateRangeAvailability(allIncidents, category, startDate, endDate);
      const up100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) === 100);
      const below100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) < 100);
      const canvasId = `availability-chart-${category.replace(/\s/g, '-')}`;

      ensureChartJsLoaded(() => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy previous chart if exists
        if (window[`availabilityChart_${category}`]) {
          window[`availabilityChart_${category}`].destroy();
        }

        window[`availabilityChart_${category}`] = new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Uptime = 100%', 'Uptime < 100%'],
            datasets: [{
              data: [up100.length, below100.length],
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

      });
    });
  }, [allIncidents, startDate, endDate]);



  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading availability data...</p>
      </div>
    );
  }

  const periodLabel = `${startDate} → ${endDate}`;

  const categories = [
    "Core Switch",
    "WAN Firewall",
    "Access & Distribution Switches",
    "Access Points Availability"
  ];

  return (
    <div className="availability-dashboard">
      <div className="dashboard-header">
        <h1>Network Availability Report</h1>
        <div className="header-actions">
          <div className="month-indicator" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ color: '#ffc107' }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <span style={{ color: '#aaa', marginLeft: 8 }}>{periodLabel}</span>
          </div>
          <button 
            className="download-btn"
            onClick={() => downloadAvailabilityReport(allIncidents, startDate, endDate)}
            title="Download Availability Report"
          >
            📥 Download Report
          </button>
        </div>
      </div>
      {categories.map(category => {
        const availabilitiesForCategory = calculateRangeAvailability(allIncidents, category, startDate, endDate);
        const up100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) === 100);
        const below100 = availabilitiesForCategory.filter(a => parseFloat(a.availability) < 100);
        const total = availabilitiesForCategory.length;
        const up100Percent = total ? ((up100.length / total) * 100).toFixed(0) : 0;
        const below100Percent = total ? ((below100.length / total) * 100).toFixed(0) : 0;
        return (
          <div key={category} className="category-report-section" style={{marginBottom: 60}}>
            <h2 style={{color:'#ffc107', marginBottom: 20}}>{category} Availability</h2>
            <div className="dashboard-content">
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder={`Search ${category} uplinks...`}
                  onChange={(e) => {
                    const q = e.target.value.trim().toLowerCase();
                    // Recompute with current range
                    const filteredRange = calculateRangeAvailability(allIncidents, category, startDate, endDate).filter(a => a.subValue.toLowerCase().includes(q));
                    // Override arrays for rendering
                    const up = filteredRange.filter(a => parseFloat(a.availability) === 100);
                    const down = filteredRange.filter(a => parseFloat(a.availability) < 100);
                    // Mutate local variables for this render block
                    up100.splice(0, up100.length, ...up);
                    below100.splice(0, below100.length, ...down);
                  }}
                />
              </div>
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
                     <div className="chart-header">
                       <h2>{category} Uplink Availability Overview</h2>
                       <div className="chart-download-buttons">
                         <button 
                           className="chart-download-btn comprehensive"
                           onClick={() => downloadComprehensiveChart(category, up100, below100, up100Percent, below100Percent)}
                           title={`Download ${category} Complete Report as Image`}
                         >
                           📊 Download Complete Report
                         </button>
                         <button 
                           className="chart-download-btn chart-only"
                           onClick={() => downloadChartAsImage(category)}
                           title={`Download ${category} Chart Only as Image`}
                         >
                           📈 Download Chart Only
                         </button>
                       </div>
                     </div>
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