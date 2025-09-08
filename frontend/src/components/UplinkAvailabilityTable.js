import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import '../css/UplinkTable.css';

const categories = [
  'Core Switch',
  'WAN Firewall',
  'Access & Distribution Switches',
  'Access Points Availability'
];

const UplinkAvailabilityTable = () => {
  const [incidents, setIncidents] = useState([]);
  const [subValueDowntime, setSubValueDowntime] = useState({});
  const [categoryTables, setCategoryTables] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const tableRefs = useRef({});
  const [modalIncidents, setModalIncidents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalUplink, setModalUplink] = useState('');
  const modalTableRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    axios.get('https://mern-incident-sable.vercel.app/api/incidents').then(res => {
      setIncidents(res.data);
      setDataLoaded(true);
    });
  }, []);

  useEffect(() => {
    const downtime = calculateSubValueDowntime(incidents, selectedMonth);
    setSubValueDowntime(downtime);
    // Group by category
    const grouped = {};
    Object.entries(downtime).forEach(([subValue, data]) => {
      const cat = getCategoryForSubValue(subValue, incidents);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ subValue, ...data });
    });
    // Apply search filter
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      Object.keys(grouped).forEach(cat => {
        grouped[cat] = grouped[cat].filter(row => row.subValue.toLowerCase().includes(q));
      });
    }
    setCategoryTables(grouped);
  }, [incidents, selectedMonth, searchText]);

  function getCategoryForSubValue(subValue, incidents) {
    const found = incidents.find(i => i.subValue === subValue);
    return found ? found.category : 'Other';
  }

  function calculateSubValueDowntime(incidents, selectedMonth) {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const totalMinutesInMonth = daysInMonth * 24 * 60;
    const allSubValues = Array.from(new Set(incidents.map(i => i.subValue)));
    const subValueDowntime = {};
    allSubValues.forEach(subValue => {
      const subValueIncidents = incidents.filter(inc => 
        inc.subValue === subValue && 
        inc.downTimeDate && 
        inc.downTimeDate.slice(0, 7) === selectedMonth
      );
      let plannedDowntime = 0;
      let unplannedDowntime = 0;
      let remarks = [];
      subValueIncidents.forEach(incident => {
        if (incident.downTimeDate && incident.upTimeDate && 
            incident.downTimeDate !== '-' && incident.upTimeDate !== '-') {
          const downTime = new Date(incident.downTimeDate);
          const upTime = new Date(incident.upTimeDate);
          if (!isNaN(downTime) && !isNaN(upTime) && upTime > downTime) {
            const downtimeMinutes = (upTime - downTime) / (1000 * 60);
            if (incident.downType === 'Planned') {
              plannedDowntime += downtimeMinutes;
              if (incident.remarks && incident.remarks !== '-') {
                remarks.push(`Planned : ${incident.remarks} (${Math.round(downtimeMinutes)} m)`);
              } else {
                remarks.push(`Planned : ${Math.round(downtimeMinutes)} m`);
              }
            } else if (incident.downType === 'Unplanned') {
              unplannedDowntime += downtimeMinutes;
              if (incident.remarks && incident.remarks !== '-') {
                remarks.push(`Unplanned : ${incident.remarks} (${Math.round(downtimeMinutes)} m)`);
              } else {
                remarks.push(`Unplanned : ${Math.round(downtimeMinutes)} m`);
              }
            }
          }
        }
      });
      const totalDowntime = plannedDowntime + unplannedDowntime;
      const uptime = totalMinutesInMonth - totalDowntime;
      const uptimePercentage = ((uptime / totalMinutesInMonth) * 100).toFixed(2);
      const plannedPercentage = ((plannedDowntime / totalMinutesInMonth) * 100).toFixed(2);
      const unplannedPercentage = ((unplannedDowntime / totalMinutesInMonth) * 100).toFixed(2);
      subValueDowntime[subValue] = {
        uptime: uptimePercentage,
        plannedDowntime: plannedDowntime ? plannedPercentage + '%' : '-',
        unplannedDowntime: unplannedDowntime ? unplannedPercentage + '%' : '-',
        totalDowntime: totalDowntime ? Math.round(totalDowntime) + ' m' : '-',
        remarks: remarks.length > 0 ? remarks.join('\n') : '-',
        hasDowntime: totalDowntime > 0
      };
    });
    return subValueDowntime;
  }

  const handleDownloadImage = async (cat) => {
    const element = tableRefs.current[cat];
    
    if (!element || !dataLoaded) {
      alert("Table isn't ready for download yet. Please wait for data to load.");
      return;
    }

    // Ensure element has size
    const { offsetWidth, offsetHeight } = element;
    console.log(`Element dimensions: ${offsetWidth}x${offsetHeight}`);
    
    if (offsetWidth === 0 || offsetHeight === 0) {
      alert("Table isn't visible or has no size. Please ensure the table is fully loaded.");
      return;
    }

    // Wait a bit to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Force a reflow to ensure proper rendering
      element.style.display = 'none';
      // eslint-disable-next-line no-unused-expressions
      element.offsetHeight; // Force reflow
      element.style.display = '';

      const canvas = await html2canvas(element, { 
        backgroundColor: '#222',
        scale: 1, // Reduced scale for better compatibility
        useCORS: true,
        allowTaint: true,
        logging: true, // Enable logging for debugging
        width: offsetWidth,
        height: offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight
      });
      
      const link = document.createElement('a');
      link.download = `${cat.replace(/\s/g, '_').toLowerCase()}-uplink-availability-table.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      
      // Try alternative approach with simpler options
      try {
        console.log('Trying alternative approach...');
        const canvas = await html2canvas(element, { 
          backgroundColor: '#222',
          scale: 1,
          useCORS: false,
          allowTaint: false
        });
        
        const link = document.createElement('a');
        link.download = `${cat.replace(/\s/g, '_').toLowerCase()}-uplink-availability-table.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (secondError) {
        console.error('Second attempt failed:', secondError);
        
        // Try creating a simplified version for download
        try {
          console.log('Trying simplified table approach...');
          await downloadSimplifiedTable(cat);
        } catch (thirdError) {
          console.error('All attempts failed:', thirdError);
          alert('Failed to generate image. The table might have complex styling that prevents image generation.');
        }
      }
    }
  };

  const downloadSimplifiedTable = async (cat) => {
    // Create a simplified table structure for better compatibility
    const tableData = categoryTables[cat] || [];
    if (tableData.length === 0) {
      alert('No data available for this category.');
      return;
    }

    // Create a temporary container with the same styling as original
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%);
      color: #ffffff;
      padding: 30px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid #444;
      max-width: 1400px;
    `;

    // Add header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #222 0%, #333 100%);
      padding: 20px 30px;
      margin: 0 0 30px 0;
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid #444;
      position: relative;
      overflow: hidden;
    `;
    
    const headerTitle = document.createElement('h1');
    headerTitle.textContent = 'Uplink Availability';
    headerTitle.style.cssText = `
      margin: 0;
      color: #ffc107;
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(45deg, #ffc107, #ff8c00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    `;
    header.appendChild(headerTitle);
    tempContainer.appendChild(header);

    // Add category title
    const categoryTitle = document.createElement('h2');
    categoryTitle.textContent = cat;
    categoryTitle.style.cssText = `
      color: #ffc107;
      font-size: 1.8rem;
      font-weight: 600;
      margin: 0 0 25px 0;
    `;
    tempContainer.appendChild(categoryTitle);

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid #333;
    `;

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Uplink', 'Uptime', 'Planned', 'Unplanned', 'Total Downtime', 'Remarks'];
    
    headers.forEach((headerText, index) => {
      const th = document.createElement('th');
      th.textContent = headerText;
      th.style.cssText = `
        background: linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 50%, #3a3a3a 100%);
        color: #ffc107;
        font-weight: 600;
        padding: 15px 12px;
        text-align: center;
        border: 1px solid #444;
        font-size: 14px;
        position: relative;
        overflow: hidden;
      `;
      
      // Add yellow border at top
      const border = document.createElement('div');
      border.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #ffc107, #ff8c00);
      `;
      th.appendChild(border);
      
      if (index === 0) {
        th.style.textAlign = 'left';
        th.style.width = '25%';
      } else if (index === 1) {
        th.style.width = '8%';
      } else if (index === 2 || index === 3) {
        th.style.width = '8%';
      } else if (index === 4) {
        th.style.width = '12%';
      } else if (index === 5) {
        th.style.width = '35%';
      }
      
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    tableData.forEach(row => {
      const tr = document.createElement('tr');
      tr.style.cssText = `
        background: ${row.hasDowntime ? 'linear-gradient(135deg, #0c0c0c 0%, #1c1c1c 100%)' : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'};
      `;

      const cells = [
        row.subValue,
        `${row.uptime}%`,
        row.plannedDowntime,
        row.unplannedDowntime,
        row.totalDowntime,
        row.remarks.replace(/\n/g, '; ')
      ];

      cells.forEach((cellText, index) => {
        const td = document.createElement('td');
        td.textContent = cellText;
        
        let cellStyle = `
          padding: 12px 8px;
          border: 1px solid #333;
          vertical-align: top;
          transition: background 0.2s ease;
        `;
        
        if (index === 0) {
          // Uplink name column
          cellStyle += `
            background: linear-gradient(135deg, #0d0d0d 0%, #1d1d1d 100%), 
                        linear-gradient(45deg, rgba(255, 193, 7, 0.06) 0%, transparent 40%, rgba(255, 193, 7, 0.06) 60%, transparent 100%) !important;
            color: #ffffff;
            text-align: left;
            font-weight: 500;
          `;
        } else if (index === 1) {
          // Uptime column
          const isGood = parseFloat(row.uptime) === 100;
          cellStyle += `
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            ${isGood ? 
              'background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important; color: #ffffff;' : 
              'background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%) !important; color: #000000;'
            }
            box-shadow: 0 2px 8px ${isGood ? 'rgba(40, 167, 69, 0.3)' : 'rgba(255, 193, 7, 0.3)'};
          `;
        } else if (index === 2 || index === 3 || index === 4) {
          // Planned, Unplanned, Total Downtime columns
          cellStyle += `
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%), 
                        linear-gradient(45deg, rgba(255, 193, 7, 0.07) 0%, transparent 35%, rgba(255, 193, 7, 0.07) 65%, transparent 100%) !important;
            color: #ffffff;
            text-align: center;
          `;
        } else if (index === 5) {
          // Remarks column
          cellStyle += `
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%), 
                        linear-gradient(45deg, rgba(255, 193, 7, 0.09) 0%, transparent 25%, rgba(255, 193, 7, 0.09) 75%, transparent 100%) !important;
            color: #ffffff;
            text-align: left;
            line-height: 1.4;
          `;
        }
        
        td.style.cssText = cellStyle;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    tempContainer.appendChild(table);

    // Add footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      background: linear-gradient(135deg, #222 0%, #333 100%);
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #ffc107;
      font-weight: 600;
      font-size: 14px;
      border-top: 1px solid #444;
      margin-top: 20px;
      border-radius: 10px;
    `;
    
    const footerLeft = document.createElement('div');
    footerLeft.textContent = 'Network Operation Centre';
    footerLeft.style.color = '#ffc107';
    
    const footerRight = document.createElement('div');
    footerRight.textContent = new Date().toLocaleString('default', { year: 'numeric', month: 'long' });
    footerRight.style.color = '#ffc107';
    
    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);
    tempContainer.appendChild(footer);

    document.body.appendChild(tempContainer);

    try {
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#0c0c0c',
        scale: 2,
        useCORS: false,
        allowTaint: false,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight
      });

      const link = document.createElement('a');
      link.download = `${cat.replace(/\s/g, '_').toLowerCase()}-uplink-availability-table.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const handleViewIncidents = (subValue) => {
    const filtered = incidents.filter(i => i.subValue === subValue && i.downTimeDate && i.downTimeDate.slice(0, 7) === selectedMonth);
    setModalIncidents(filtered);
    setModalUplink(subValue);
    setShowModal(true);
  };

  return (
    <div className="uplink-container">
      <div className="table-header">
        <h1>Uplink Availability</h1>
        <div className="header-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          <input type="text" placeholder="Search uplink..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
      </div>
      {categories.map(cat => (
        <div key={cat} className="category-section">
          <div className="category-header">
            <h2 className="category-title">{cat}</h2>
            <button 
              onClick={() => handleDownloadImage(cat)} 
              className="download-btn"
              disabled={!dataLoaded}
            >
              📷 Download Table as Image
            </button>
          </div>
          <div ref={el => (tableRefs.current[cat] = el)}>
            <table className="uplink-table">
              <thead>
                <tr>
                  <th className="uplink-col">Uplink</th>
                  <th className="uptime-col">Uptime</th>
                  <th className="downtime-header" colSpan="2">
                    <div>Downtime</div>
                  </th>
                  <th className="total-downtime-col">
                    <div>Total Downtime</div>
                    <div className="sub-header">(Planned + Unplanned)</div>
                    <div className="sub-header">(Out of 720 h)</div>
                  </th>
                  <th className="remarks-col">Remarks</th>
                  <th className="actions-col">Actions</th>
                </tr>
                <tr className="sub-headers">
                  <th></th>
                  <th></th>
                  <th className="planned-col">Planned</th>
                  <th className="unplanned-col">Unplanned</th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(categoryTables[cat] || []).map((row, index) => (
                  <tr key={index} className={row.hasDowntime ? 'downtime-row' : ''}>
                    <td className="uplink-name">{row.subValue}</td>
                    <td className={`uptime ${row.hasDowntime ? 'uptime-warning' : 'uptime-good'}`}>{row.uptime}%</td>
                    <td className="planned">{row.plannedDowntime}</td>
                    <td className="unplanned">{row.unplannedDowntime}</td>
                    <td className="total-downtime">{row.totalDowntime}</td>
                    <td className="remarks">
                      {row.remarks.split('\n').map((line, i) => (
                        <div key={i}>
                          {line.includes('Planned :') && (
                            <><span className="planned-label">Planned :</span>{line.replace('Planned :', '')}</>
                          )}
                          {line.includes('Unplanned :') && (
                            <><span className="unplanned-label">Unplanned :</span>{line.replace('Unplanned :', '')}</>
                          )}
                          {!line.includes('Planned :') && !line.includes('Unplanned :') && line}
                        </div>
                      ))}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleViewIncidents(row.subValue)} 
                        className="action-btn"
                      >
                        View Incidents
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <div className="footer-left">Network Operation Centre</div>
              <div className="footer-right">{new Date().toLocaleString('default', { year: 'numeric', month: 'long' })}</div>
            </div>
          </div>
        </div>
      ))}
      {/* Modal for viewing incidents */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            <div className="category-header">
              <h2 className="category-title">Incidents for {modalUplink}</h2>
              <button
                onClick={async () => {
                  if (!modalTableRef.current) return;
                  
                  const { offsetWidth, offsetHeight } = modalTableRef.current;
                  console.log(`Modal element dimensions: ${offsetWidth}x${offsetHeight}`);
                  
                  if (offsetWidth === 0 || offsetHeight === 0) {
                    alert("Modal table isn't visible or has no size.");
                    return;
                  }

                  // Wait a bit to ensure rendering is complete
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  try {
                    // Force a reflow to ensure proper rendering
                    modalTableRef.current.style.display = 'none';
                    // eslint-disable-next-line no-unused-expressions
                    modalTableRef.current.offsetHeight; // Force reflow
                    modalTableRef.current.style.display = '';

                    const canvas = await html2canvas(modalTableRef.current, { 
                      backgroundColor: '#222',
                      scale: 1,
                      useCORS: true,
                      allowTaint: true,
                      logging: true,
                      width: offsetWidth,
                      height: offsetHeight,
                      scrollX: 0,
                      scrollY: 0,
                      windowWidth: document.documentElement.offsetWidth,
                      windowHeight: document.documentElement.offsetHeight
                    });
                    const link = document.createElement('a');
                    link.download = `incidents-for-${modalUplink.replace(/\s/g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  } catch (error) {
                    console.error('Error generating modal image:', error);
                    
                    // Try alternative approach
                    try {
                      console.log('Trying alternative approach for modal...');
                      const canvas = await html2canvas(modalTableRef.current, { 
                        backgroundColor: '#222',
                        scale: 1,
                        useCORS: false,
                        allowTaint: false
                      });
                      const link = document.createElement('a');
                      link.download = `incidents-for-${modalUplink.replace(/\s/g, '_')}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } catch (secondError) {
                      console.error('Second attempt failed for modal:', secondError);
                      alert('Failed to generate modal image. The table might have complex styling that prevents image generation.');
                    }
                  }
                }}
                className="download-btn"
              >
                📷 Download Image
              </button>
            </div>
            <table ref={modalTableRef} className="modal-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Sub-Value</th>
                  <th>Down Time Date & Time</th>
                  <th>Down Type</th>
                  <th>Up Time Date & Time</th>
                  <th>Escalated Person</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {modalIncidents.map((inc, idx) => (
                  <tr key={idx}>
                    <td>{inc.category}</td>
                    <td>{inc.subValue}</td>
                    <td>{inc.downTimeDate}</td>
                    <td>{inc.downType}</td>
                    <td>{inc.upTimeDate}</td>
                    <td>{inc.escalatedPerson}</td>
                    <td>{inc.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UplinkAvailabilityTable;