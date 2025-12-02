import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { subValues } from '../utils/subValues';
import '../css/SectorSummary.css';


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
    // Ignore storage errors silently
  }
};

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

// Function to determine sector from subValue
function getSectorFromSubValue(subValue) {
  if (!subValue) return 'Other';
  const upper = subValue.toUpperCase();
  if (upper.startsWith('ADV-') || upper.startsWith('ADV_')) return 'Advantis';
  if (upper.startsWith('FIBER-') || upper.startsWith('FIBER_')) return 'Fiber';
  if (upper.startsWith('AGRO-') || upper.startsWith('AGRO_')) return 'Agro';
  if (upper.startsWith('FABRIC') || upper.startsWith('FABRIC-') || upper.startsWith('FABRIC_')) return 'Fabric';
  if (upper.startsWith('AMAYA')) return 'Amaya';
  if (upper.startsWith('ALUMEX')) return 'Alumex';
  if (upper.startsWith('DPL-') || upper.startsWith('DPL_')) return 'DPL';
  if (upper.startsWith('HAYCARB-') || upper.startsWith('HAYCARB_')) return 'Haycarb';
  return 'Other';
}

// Calculate availability for each device in each sector
function calculateSectorAvailability(incidents, startDateStr, endDateStr) {
  const periodStart = new Date(`${startDateStr}T00:00:00`);
  const periodEnd = new Date(`${endDateStr}T23:59:59`);
  const totalMinutes = Math.max(0, (periodEnd - periodStart) / (1000 * 60));
  
  // Get all WAN Firewall subValues from subValues.js
  const allWanFirewallSubValues = subValues['WAN Firewall'] || [];
  
  // Group all WAN Firewall devices by sector
  const sectorDeviceMap = {};
  allWanFirewallSubValues.forEach(subValue => {
    const sector = getSectorFromSubValue(subValue);
    if (sector !== 'Other') {
      if (!sectorDeviceMap[sector]) {
        sectorDeviceMap[sector] = [];
      }
      sectorDeviceMap[sector].push(subValue);
    }
  });
  
  // Filter WAN Firewall incidents
  const wanFirewallIncidents = incidents.filter(inc => inc.category === 'WAN Firewall');
  
  // Calculate availability for each sector
  const sectorResults = {};
  
  Object.keys(sectorDeviceMap).forEach(sector => {
    const sectorDevices = sectorDeviceMap[sector];
    
    if (sectorDevices.length === 0) {
      sectorResults[sector] = {
        sector,
        devices: [],
        up100: [],
        below100: [],
        totalDevices: 0
      };
      return;
    }
    
    // Calculate availability for each device in this sector
    const deviceAvailabilities = sectorDevices.map(subValue => {
      const subValueIncidents = wanFirewallIncidents.filter(inc =>
        inc.subValue === subValue &&
        inc.downTimeDate && inc.upTimeDate &&
        inc.downTimeDate !== '-' && inc.upTimeDate !== '-' &&
        inc.downType !== 'Not Down' &&
        incidentIntersectsPeriod(inc, periodStart, periodEnd)
      );
      
      // If no incidents, treat as 100% availability
      if (subValueIncidents.length === 0) {
        return { subValue, availability: '100.00' };
      }
      
      // Calculate total downtime for this device
      let totalDowntime = 0;
      subValueIncidents.forEach(inc => {
        const down = new Date(inc.downTimeDate);
        const up = new Date(inc.upTimeDate);
        if (!isNaN(down) && !isNaN(up)) {
          const minutes = clipDowntimeMinutes(down, up, periodStart, periodEnd);
          if (minutes > 0) totalDowntime += minutes;
        }
      });
      
      const availability = totalMinutes === 0 ? 100 : ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(2);
      return { subValue, availability };
    });
    
    // Separate devices into up100 and below100
    const up100 = deviceAvailabilities.filter(d => parseFloat(d.availability) === 100);
    const below100 = deviceAvailabilities.filter(d => parseFloat(d.availability) < 100);
    
    sectorResults[sector] = {
      sector,
      devices: deviceAvailabilities,
      up100,
      below100,
      totalDevices: sectorDevices.length
    };
  });
  
  // Filter out sectors with 0 devices and 'Other'
  return Object.values(sectorResults).filter(s => s.totalDevices > 0 && s.sector !== 'Other');
}

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

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Function to create a single image with 4 charts - IMPROVED STYLING
const createChartImage = (chartData, startDate, endDate, imageNumber) => {
  return new Promise((resolve) => {
    if (chartData.length === 0) {
      resolve(null);
      return;
    }

    const combinedCanvas = document.createElement('canvas');
    const ctx = combinedCanvas.getContext('2d');
    
    // Enhanced layout values with better spacing
    const padding = 70;
    const titleHeight = 180;
    const cardSize = 750;
    const combinedWidth = padding * 3 + cardSize * 2;
    const combinedHeight = titleHeight + padding * 3 + cardSize * 2;
    
    combinedCanvas.width = combinedWidth;
    combinedCanvas.height = combinedHeight;
    
    // Enhanced background with gradient pattern
    const bgGradient = ctx.createLinearGradient(0, 0, combinedWidth, combinedHeight);
    bgGradient.addColorStop(0, '#0a0e14');
    bgGradient.addColorStop(0.5, '#151820');
    bgGradient.addColorStop(1, '#1a1f2e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, combinedWidth, combinedHeight);
    
    // Add subtle pattern overlay
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < combinedWidth; i += 40) {
      for (let j = 0; j < combinedHeight; j += 40) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(i, j, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    
    // Decorative header background
    ctx.save();
    const headerGradient = ctx.createLinearGradient(0, 0, combinedWidth, titleHeight);
    headerGradient.addColorStop(0, 'rgba(255, 193, 7, 0.15)');
    headerGradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.12)');
    headerGradient.addColorStop(1, 'rgba(255, 193, 7, 0.15)');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, combinedWidth, titleHeight);
    ctx.restore();
    
    // Decorative top border
    const borderGradient = ctx.createLinearGradient(0, 0, combinedWidth, 0);
    borderGradient.addColorStop(0, 'transparent');
    borderGradient.addColorStop(0.2, '#ffc107');
    borderGradient.addColorStop(0.5, '#ff8c00');
    borderGradient.addColorStop(0.8, '#ffc107');
    borderGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = borderGradient;
    ctx.fillRect(0, 0, combinedWidth, 6);
    
    // Main Title with enhanced styling
    ctx.save();
    ctx.shadowColor = 'rgba(255, 193, 7, 0.6)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffc107';
    ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WAN Firewall Sector Summary`, combinedWidth / 2, 65);
    ctx.restore();
    
    // Subtitle with part number
    ctx.fillStyle = 'rgba(255, 193, 7, 0.9)';
    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Part ${imageNumber}`, combinedWidth / 2, 105);
    
    // Date Range with enhanced styling
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '26px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(`📅 ${startDate} → ${endDate}`, combinedWidth / 2, 145);
    ctx.restore();
    
    // Load and draw each chart image with enhanced statistics
    const imagePromises = chartData.map((item, index) => {
      return new Promise((resolveImg) => {
        const img = new Image();
        img.onload = () => {
          const row = Math.floor(index / 2);
          const col = index % 2;
          const cardX = padding + col * (cardSize + padding);
          const cardY = titleHeight + padding + row * (cardSize + padding);

          // Enhanced card background with gradient and shadow
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 30;
          ctx.shadowOffsetY = 10;
          drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, 32);
          ctx.clip();
          
          const cardGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardSize, cardY + cardSize);
          cardGradient.addColorStop(0, 'rgba(28, 32, 38, 0.98)');
          cardGradient.addColorStop(0.5, 'rgba(38, 42, 48, 0.96)');
          cardGradient.addColorStop(1, 'rgba(48, 52, 58, 0.95)');
          ctx.fillStyle = cardGradient;
          ctx.fillRect(cardX, cardY, cardSize, cardSize);
          ctx.restore();

          // Glowing card border
          ctx.save();
          ctx.shadowColor = 'rgba(255, 193, 7, 0.4)';
          ctx.shadowBlur = 20;
          ctx.strokeStyle = 'rgba(255, 193, 7, 0.7)';
          ctx.lineWidth = 3.5;
          drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, 32);
          ctx.stroke();
          ctx.restore();

          // Decorative corner accent
          ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
          ctx.beginPath();
          ctx.arc(cardX + 32, cardY + 32, 8, 0, Math.PI * 2);
          ctx.fill();

          // Sector name with enhanced styling
          ctx.save();
          ctx.shadowColor = 'rgba(255, 193, 7, 0.5)';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#ffc107';
          ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${item.sector} Sector`, cardX + 45, cardY + 60);
          ctx.restore();
          
          // Device count with icon
          ctx.font = '20px "Segoe UI", Arial, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillText(`🔗 Total Devices: ${item.totalDevices}`, cardX + 45, cardY + 95);

          // Chart area with enhanced container
          const chartSize = 350;
          const chartAreaX = cardX + 45;
          const chartAreaY = cardY + 130;
          const chartContainerSize = chartSize + 40;

          // Enhanced chart background
          ctx.save();
          drawRoundedRect(ctx, chartAreaX, chartAreaY, chartContainerSize, chartContainerSize, 24);
          ctx.clip();
          const chartBgGradient = ctx.createRadialGradient(
            chartAreaX + chartContainerSize / 2, 
            chartAreaY + chartContainerSize / 2, 
            0,
            chartAreaX + chartContainerSize / 2, 
            chartAreaY + chartContainerSize / 2, 
            chartContainerSize / 2
          );
          chartBgGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
          chartBgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
          ctx.fillStyle = chartBgGradient;
          ctx.fillRect(chartAreaX, chartAreaY, chartContainerSize, chartContainerSize);
          ctx.restore();

          // Glowing chart border
          ctx.save();
          ctx.shadowColor = 'rgba(255, 193, 7, 0.3)';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = 'rgba(255, 193, 7, 0.4)';
          ctx.lineWidth = 2.5;
          drawRoundedRect(ctx, chartAreaX, chartAreaY, chartContainerSize, chartContainerSize, 24);
          ctx.stroke();
          ctx.restore();

          // Draw chart perfectly centered
          const chartXPos = chartAreaX + 20;
          const chartYPos = chartAreaY + 20;
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = chartSize;
          tempCanvas.height = chartSize;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.drawImage(img, 0, 0, chartSize, chartSize);
          ctx.drawImage(tempCanvas, chartXPos, chartYPos, chartSize, chartSize);

          // Enhanced statistics panel
          const statsPanelWidth = cardSize - 90;
          const statsPanelHeight = 180;
          const statsX = cardX + 45;
          const statsY = chartAreaY + chartContainerSize + 28;

          // Stats panel with gradient and glow
          ctx.save();
          ctx.shadowColor = 'rgba(255, 193, 7, 0.2)';
          ctx.shadowBlur = 20;
          drawRoundedRect(ctx, statsX, statsY, statsPanelWidth, statsPanelHeight, 24);
          ctx.clip();
          
          const statsGradient = ctx.createLinearGradient(statsX, statsY, statsX + statsPanelWidth, statsY + statsPanelHeight);
          statsGradient.addColorStop(0, 'rgba(255, 193, 7, 0.15)');
          statsGradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.18)');
          statsGradient.addColorStop(1, 'rgba(255, 193, 7, 0.15)');
          ctx.fillStyle = statsGradient;
          ctx.fillRect(statsX, statsY, statsPanelWidth, statsPanelHeight);
          ctx.restore();

          // Enhanced stats panel border
          ctx.save();
          ctx.shadowColor = 'rgba(255, 193, 7, 0.4)';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)';
          ctx.lineWidth = 3;
          drawRoundedRect(ctx, statsX, statsY, statsPanelWidth, statsPanelHeight, 24);
          ctx.stroke();
          ctx.restore();

          // Stats title with icon
          ctx.save();
          ctx.shadowColor = 'rgba(255, 193, 7, 0.4)';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#ffc107';
          ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('📊 Key Metrics', statsX + 32, statsY + 22);
          ctx.restore();

          // Enhanced metrics display
          const metrics = [
            { label: 'Uptime = 100%', value: `${item.up100Count} (${item.up100Percent}%)`, color: '#28a745', icon: '✅' },
            { label: 'Uptime < 100%', value: `${item.below100Count} (${item.below100Percent}%)`, color: '#ffc107', icon: '⚠️' },
          ];

          const labelFontSize = 19;
          const valueFontSize = 28;
          const lineHeight = Math.max(labelFontSize, valueFontSize) + 10;
          const metricsStartY = statsY + 62;

          metrics.forEach((metric, idx) => {
            const lineY = metricsStartY + idx * lineHeight;
            
            // Metric label with icon
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.font = `${labelFontSize}px "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`${metric.icon} ${metric.label}`, statsX + 32, lineY);

            // Metric value with enhanced styling
            ctx.save();
            ctx.shadowColor = metric.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = metric.color;
            ctx.font = `bold ${valueFontSize}px "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(metric.value, statsX + statsPanelWidth - 32, lineY);
            ctx.restore();
          });
          
          resolveImg();
        };
        img.src = item.imageData;
      });
    });
    
    // Wait for all images to load, then resolve with canvas data
    Promise.all(imagePromises).then(() => {
      resolve(combinedCanvas.toDataURL('image/png'));
    });
  });
};

// Function to download all sector charts as two images (4 charts each) with statistics
const downloadAllSectorCharts = (sectorData, startDate, endDate) => {
  const allSectors = ['Advantis', 'Fiber', 'Agro', 'Fabric', 'Amaya', 'Alumex', 'DPL', 'Haycarb'];
  const chartData = [];
  
  // Get all chart instances and sector data
  allSectors.forEach(sectorName => {
    const chartKey = `sectorChart_${sectorName}`;
    const chart = window[chartKey];
    const sectorInfo = sectorData.find(s => s.sector === sectorName);
    
    if (chart && sectorInfo) {
      const imageData = chart.toBase64Image();
      const total = sectorInfo.up100.length + sectorInfo.below100.length;
      const up100Percent = total > 0 ? ((sectorInfo.up100.length / total) * 100).toFixed(1) : 0;
      const below100Percent = total > 0 ? ((sectorInfo.below100.length / total) * 100).toFixed(1) : 0;
      
      chartData.push({
        imageData,
        sector: sectorName,
        totalDevices: sectorInfo.totalDevices,
        up100Count: sectorInfo.up100.length,
        below100Count: sectorInfo.below100.length,
        up100Percent,
        below100Percent
      });
    }
  });
  
  if (chartData.length === 0) {
    alert('No charts available to download');
    return;
  }
  
  // Split into two groups of 4
  const firstGroup = chartData.slice(0, 4);
  const secondGroup = chartData.slice(4, 8);
  
  // Create both images
  Promise.all([
    createChartImage(firstGroup, startDate, endDate, 1),
    createChartImage(secondGroup, startDate, endDate, 2)
  ]).then(images => {
    images.filter(Boolean).forEach((imageData, idx) => {
      const link = document.createElement('a');
      link.download = `wan-firewall-sector-summary-part${idx + 1}-${startDate}-to-${endDate}.png`;
      link.href = imageData;
      setTimeout(() => link.click(), idx * 500);
    });
  });
};

const SectorSummary = () => {
  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allIncidents, setAllIncidents] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const firstOfMonth = new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    return getStoredDate('sectorSummaryStartDate', firstOfMonth);
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getStoredDate('sectorSummaryEndDate', today);
  });

  useEffect(() => {
    axios.get('http://localhost:5000/api/incidents').then(res => {
      setAllIncidents(res.data);
      const data = calculateSectorAvailability(res.data, startDate, endDate);
      setSectorData(data);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching incidents:', err);
      setLoading(false);
    });
  }, []);

  // Update data when date range changes
  useEffect(() => {
    if (allIncidents.length > 0) {
      const data = calculateSectorAvailability(allIncidents, startDate, endDate);
      setSectorData(data);
    }
  }, [startDate, endDate, allIncidents]);

  // Create charts for each sector
  useEffect(() => {
    if (sectorData.length === 0) return;
    
    ensureChartJsLoaded(() => {
      sectorData.forEach(sector => {
        const canvasId = `sector-chart-${sector.sector.toLowerCase()}`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Destroy previous chart if exists
        const chartKey = `sectorChart_${sector.sector}`;
        if (window[chartKey]) {
          window[chartKey].destroy();
        }

        const total = sector.up100.length + sector.below100.length;
        const up100Percent = total > 0 ? ((sector.up100.length / total) * 100).toFixed(0) : 0;
        const below100Percent = total > 0 ? ((sector.below100.length / total) * 100).toFixed(0) : 0;

        // Set canvas to exact square dimensions
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.width = '400px';
        canvas.style.height = '400px';

        const ctx = canvas.getContext('2d');

        window[chartKey] = new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Uptime = 100%', 'Uptime < 100%'],
            datasets: [{
              data: [sector.up100.length, sector.below100.length],
              backgroundColor: [
                'rgba(40, 167, 69, 0.85)',
                'rgba(255, 193, 7, 0.85)'
              ],
              borderColor: [
                'rgba(40, 167, 69, 1)',
                'rgba(255, 193, 7, 1)'
              ],
              borderWidth: 3,
              hoverOffset: 18
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: true,
            aspectRatio: 1,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#ffc107',
                borderWidth: 2,
                padding: 12,
                titleFont: {
                  size: 14,
                  weight: 'bold'
                },
                bodyFont: {
                  size: 13
                },
                callbacks: {
                  label: function(context) {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                  }
                }
              }
            },
            elements: { 
              arc: { 
                borderRadius: 10,
                borderAlign: 'inner'
              } 
            },
            animation: {
              animateRotate: true,
              animateScale: true,
              duration: 2000,
              easing: 'easeInOutQuart'
            }
          }
        });
      });
    });
  }, [sectorData]);

  useEffect(() => {
    storeDate('sectorSummaryStartDate', startDate);
  }, [startDate]);

  useEffect(() => {
    storeDate('sectorSummaryEndDate', endDate);
  }, [endDate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading sector summary data...</p>
      </div>
    );
  }

  const periodLabel = `${startDate} → ${endDate}`;
  const totalDevices = sectorData.reduce((sum, s) => sum + s.totalDevices, 0);

  return (
    <div className="availability-dashboard">
      <div className="dashboard-header">
        <h1>WAN Firewall Sector Summary</h1>
        <div className="header-actions">
          <div className="month-indicator" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ color: '#ffc107' }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <span style={{ color: '#aaa', marginLeft: 8 }}>{periodLabel}</span>
          </div>
          <button 
            className="download-btn"
            onClick={() => downloadAllSectorCharts(sectorData, startDate, endDate)}
            title="Download All Sector Charts"
            style={{ marginLeft: '20px' }}
          >
            📥 Download All Charts
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="stats-section">
          <div className="stat-cards total-uplinks">
            <div className="stat-icon">🔗</div>
            <div className="stat-info">
              <h3>Total Devices</h3>
              <span className="stat-value">{totalDevices}</span>
            </div>
          </div>
        </div>

        <div className="main-section">
          {sectorData.map(sector => {
            const total = sector.up100.length + sector.below100.length;
            const up100Percent = total > 0 ? ((sector.up100.length / total) * 100).toFixed(0) : 0;
            const below100Percent = total > 0 ? ((sector.below100.length / total) * 100).toFixed(0) : 0;

            return (
              <div key={sector.sector} className="category-report-section" style={{ marginBottom: 60 }}>
                <h2 style={{ color: '#ffc107', marginBottom: 20 }}>{sector.sector} Sector</h2>
                <div className="dashboard-content">
                  <div className="stats-section">
                    <div className="stat-cards total-uplinks">
                      <div className="stat-icon">🔗</div>
                      <div className="stat-info">
                        <h3>Total Devices</h3>
                        <span className="stat-value">{sector.totalDevices}</span>
                      </div>
                    </div>
                    <div className="stat-cards perfect-uptime">
                      <div className="stat-icon">✅</div>
                      <div className="stat-info">
                        <h3>Perfect Uptime</h3>
                        <span className="stat-value">{sector.up100.length}</span>
                        <span className="stat-percentage">({up100Percent}%)</span>
                      </div>
                    </div>
                    <div className="stat-cards downtime-occurred">
                      <div className="stat-icon">⚠️</div>
                      <div className="stat-info">
                        <h3>Had Downtime</h3>
                        <span className="stat-value">{sector.below100.length}</span>
                        <span className="stat-percentage">({below100Percent}%)</span>
                      </div>
                    </div>
                  </div>
                  <div className="main-section">
                    <div className="chart-section">
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>{sector.sector} Sector Availability Overview</h2>
                        </div>
                        <div className="chart-wrapper">
                          <canvas id={`sector-chart-${sector.sector.toLowerCase()}`}></canvas>
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
                      {sector.up100.length > 0 && (
                        <div className="table-container">
                          <h3>Perfect Uptime (100%)</h3>
                          <div className="table-wrapper">
                            <table className="availability-table perfect-table">
                              <thead>
                                <tr>
                                  <th>Device</th>
                                  <th>Uptime</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sector.up100.map(device => (
                                  <tr key={device.subValue}>
                                    <td>{device.subValue}</td>
                                    <td>100%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {sector.below100.length > 0 && (
                        <div className="table-container">
                          <h3>Had Downtime (&lt; 100%)</h3>
                          <div className="table-wrapper">
                            <table className="availability-table downtime-table">
                              <thead>
                                <tr>
                                  <th>Device</th>
                                  <th>Uptime</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sector.below100.map(device => (
                                  <tr key={device.subValue}>
                                    <td>{device.subValue}</td>
                                    <td>{device.availability}%</td>
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
      </div>
    </div>
  );
};

export default SectorSummary;