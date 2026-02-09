import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../css/AvailabilityGrowth.css';

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
    // Ignore storage issues
  }
};

const categories = [
  'All Categories',
  'Core Switch (Up Links)',
  'WAN Firewall',
  'Access & Distribution Switches',
  'Advantis Sector Switches',
  'Fabric Sector Switches',
  'Access Points Availability',
  'SAT Sector Switches'
];

const AvailabilityGrowth = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Core Switch (Up Links)');

  // Reporting period
  const [reportStartDate, setReportStartDate] = useState(() => {
    const firstOfMonth = new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    return getStoredDate('availabilityGrowthStartDate', firstOfMonth);
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getStoredDate('availabilityGrowthEndDate', today);
  });

  useEffect(() => {
    axios.get('http://localhost:5000/api/incidents')
      .then(res => setIncidents(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    storeDate('availabilityGrowthStarstDate', reportStartDate);
  }, [reportStartDate]);

  useEffect(() => {
    storeDate('availabilityGrowthEndDate', reportEndDate);
  }, [reportEndDate]);

  // Calculate monthly availability for the selected category over the period
  const monthlyAvailability = useMemo(() => {
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    
    if (isNaN(start) || isNaN(end) || end < start) {
      return [];
    }

    const monthlyData = {};
    
    // Initialize each month in the range
    const current = new Date(start);
    while (current <= end) {
      const monthStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0');
      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = { downtime: 0, totalMinutes: 0, dayCount: 0 };
      }
      
      // Count days in this month within the range
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const dayStart = current > start ? current : start;
      const dayEnd = monthEnd < end ? monthEnd : end;
      
      const daysInMonth = Math.ceil((dayEnd - dayStart) / (1000 * 60 * 60 * 24)) + 1;
      monthlyData[monthStr].totalMinutes += daysInMonth * 24 * 60;
      monthlyData[monthStr].dayCount = daysInMonth;
      
      current.setMonth(current.getMonth() + 1);
    }

    // Filter incidents based on selected category
    let categoryIncidents;
    if (selectedCategory === 'All Categories') {
      categoryIncidents = incidents.filter(i => !['Not Down'].includes(i.downType));
    } else {
      categoryIncidents = incidents.filter(i => i.category === selectedCategory && i.downType !== 'Not Down');
    }

    // Calculate downtime for each month
    categoryIncidents.forEach(incident => {
      if (!incident.downTimeDate || !incident.upTimeDate) return;

      const down = new Date(incident.downTimeDate);
      const up = new Date(incident.upTimeDate);

      if (isNaN(down) || isNaN(up) || up <= down) return;

      // Find all months this incident spans
      let current = new Date(down.getFullYear(), down.getMonth(), 1);
      while (current <= up) {
        const monthStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0');
        
        if (monthlyData[monthStr]) {
          // Calculate downtime for this month
          const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
          const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
          
          const clippedDown = down > monthStart ? down : monthStart;
          const clippedUp = up < monthEnd ? up : monthEnd;
          
          if (clippedUp > clippedDown) {
            const minutes = (clippedUp - clippedDown) / (1000 * 60);
            monthlyData[monthStr].downtime += minutes;
          }
        }
        
        current.setMonth(current.getMonth() + 1);
      }
    });

    // Convert to array and calculate availability percentage
    return Object.entries(monthlyData)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return {
          month: monthName,
          monthKey: month,
          availability: ((data.totalMinutes - data.downtime) / data.totalMinutes * 100).toFixed(2),
          downtime: Math.round(data.downtime)
        };
      });
  }, [incidents, selectedCategory, reportStartDate, reportEndDate]);

  // Ensure Chart.js is loaded
  useEffect(() => {
    if (monthlyAvailability.length === 0 || loading) return;

    const loadChart = () => {
      if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
        script.onload = renderChart;
        document.head.appendChild(script);
      } else {
        renderChart();
      }
    };

    const renderChart = () => {
      const canvas = document.getElementById('availabilityChart');
      if (!canvas) return;

      // Destroy previous chart if exists
      if (window.availabilityChartInstance) {
        window.availabilityChartInstance.destroy();
      }

      const ctx = canvas.getContext('2d');
      
      window.availabilityChartInstance = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: monthlyAvailability.map(m => m.month),
          datasets: [
            {
              label: 'Average Availability %',
              data: monthlyAvailability.map(m => parseFloat(m.availability)),
              borderColor: '#27ae60',
              backgroundColor: 'rgba(39, 174, 96, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 5,
              pointBackgroundColor: '#27ae60',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverRadius: 7,
              borderWidth: 3,
              hoverBackgroundColor: 'rgba(39, 174, 96, 0.2)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#2c3e50',
                font: { size: 14, weight: 'bold' },
                padding: 20
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#27ae60',
              borderWidth: 2,
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 }
            }
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: {
                color: '#7f8c8d',
                font: { size: 12 },
                callback: function(value) {
                  return value + '%';
                }
              },
              grid: {
                color: 'rgba(127, 140, 141, 0.1)',
                drawBorder: true
              },
              title: {
                display: true,
                text: 'Average Availability (%)',
                color: '#2c3e50',
                font: { size: 14, weight: 'bold' }
              }
            },
            x: {
              ticks: {
                color: '#7f8c8d',
                font: { size: 12 }
              },
              grid: {
                color: 'rgba(127, 140, 141, 0.1)'
              },
              title: {
                display: true,
                text: 'Month',
                color: '#2c3e50',
                font: { size: 14, weight: 'bold' }
              }
            }
          }
        }
      });
    };

    loadChart();
  }, [monthlyAvailability, loading]);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading availability growth data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="availability-growth">
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#c7c412ff', marginBottom: '20px' }}>Availability Growth Over Time</h2>
        
        {/* Controls */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginBottom: '20px',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div>
            <label style={{ color: '#2c3e50', fontWeight: '600', marginRight: '8px' }}>Category:</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '2px solid #3498db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2c3e50',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                minWidth: '250px'
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ color: '#2c3e50', fontWeight: '600', marginRight: '8px' }}>Period:</label>
            <input 
              type="date" 
              value={reportStartDate} 
              onChange={(e) => setReportStartDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '2px solid #3498db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2c3e50',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            />
            <span style={{ color: '#7f8c8d', fontWeight: '600', margin: '0 8px' }}>to</span>
            <input 
              type="date" 
              value={reportEndDate} 
              onChange={(e) => setReportEndDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '2px solid #3498db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2c3e50',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>Average Availability</h4>
            <p style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#27ae60',
              margin: '0'
            }}>
              {monthlyAvailability.length > 0 
                ? (monthlyAvailability.reduce((sum, m) => sum + parseFloat(m.availability), 0) / monthlyAvailability.length).toFixed(2)
                : '0.00'}%
            </p>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>Lowest Availability</h4>
            <p style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#e74c3c',
              margin: '0'
            }}>
              {monthlyAvailability.length > 0
                ? Math.min(...monthlyAvailability.map(m => parseFloat(m.availability))).toFixed(2)
                : '0.00'}%
            </p>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>Highest Availability</h4>
            <p style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#27ae60',
              margin: '0'
            }}>
              {monthlyAvailability.length > 0
                ? Math.max(...monthlyAvailability.map(m => parseFloat(m.availability))).toFixed(2)
                : '0.00'}%
            </p>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>Total Downtime</h4>
            <p style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#f39c12',
              margin: '0'
            }}>
              {monthlyAvailability.reduce((sum, m) => sum + m.downtime, 0)} min
            </p>
          </div>
        </div>

        {/* Chart */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          minHeight: '400px'
        }}>
          <canvas id="availabilityChart"></canvas>
        </div>

        {/* Monthly Data Table */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginTop: '20px',
          overflowX: 'auto'
        }}>
          <h3 style={{ color: '#c7c412ff', marginBottom: '15px' }}>Monthly Availability Details</h3>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e' }}>
                <th style={{
                  color: '#161515ff',
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  borderBottom: '2px solid #2c3e50'
                }}>Month</th>
                <th style={{
                  color: '#090909ff',
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  borderBottom: '2px solid #2c3e50'
                }}>Average Availability (%)</th>
                <th style={{
                  color: '#0e0e0eff',
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  borderBottom: '2px solid #2c3e50'
                }}>Total Downtime (minutes)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyAvailability.map((month, idx) => (
                <tr key={month.monthKey} style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa',
                  borderBottom: '1px solid #e1e8ed'
                }}>
                  <td style={{
                    color: '#2c3e50',
                    padding: '12px',
                    fontWeight: '500'
                  }}>
                    {month.month}
                  </td>
                  <td style={{
                    color: parseFloat(month.availability) === 100 ? '#27ae60' : '#e74c3c',
                    padding: '12px',
                    fontWeight: '600'
                  }}>
                    {month.availability}%
                  </td>
                  <td style={{
                    color: month.downtime > 0 ? '#e74c3c' : '#27ae60',
                    padding: '12px',
                    fontWeight: '600'
                  }}>
                    {month.downtime} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityGrowth;
