import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import '../css/UplinkTable.css';

const categories = [
  'Core Switch',
  'WAN Firewall',
  'Access & Distribution Switches'
];

const UplinkAvailabilityTable = () => {
  const [incidents, setIncidents] = useState([]);
  const [subValueDowntime, setSubValueDowntime] = useState({});
  const [categoryTables, setCategoryTables] = useState({});
  const tableRefs = useRef({});
  const [modalIncidents, setModalIncidents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalUplink, setModalUplink] = useState('');
  const modalTableRef = useRef(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/incidents').then(res => {
      setIncidents(res.data);
    });
  }, []);

  useEffect(() => {
    const downtime = calculateSubValueDowntime(incidents);
    setSubValueDowntime(downtime);
    // Group by category
    const grouped = {};
    Object.entries(downtime).forEach(([subValue, data]) => {
      const cat = getCategoryForSubValue(subValue, incidents);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ subValue, ...data });
    });
    setCategoryTables(grouped);
  }, [incidents]);

  function getCategoryForSubValue(subValue, incidents) {
    const found = incidents.find(i => i.subValue === subValue);
    return found ? found.category : 'Other';
  }

  function calculateSubValueDowntime(incidents) {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalMinutesInMonth = daysInMonth * 24 * 60;
    const allSubValues = Array.from(new Set(incidents.map(i => i.subValue)));
    const subValueDowntime = {};
    allSubValues.forEach(subValue => {
      const subValueIncidents = incidents.filter(inc => 
        inc.subValue === subValue && 
        inc.downTimeDate && 
        inc.downTimeDate.slice(0, 7) === thisMonth
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
    if (!tableRefs.current[cat]) return;
    const canvas = await html2canvas(tableRefs.current[cat], { backgroundColor: '#222' });
    const link = document.createElement('a');
    link.download = `${cat.replace(/\s/g, '_').toLowerCase()}-uplink-availability-table.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleViewIncidents = (subValue) => {
    const filtered = incidents.filter(i => i.subValue === subValue);
    setModalIncidents(filtered);
    setModalUplink(subValue);
    setShowModal(true);
  };

  return (
    <div className="uplink-container">
      <div className="table-header">
        <h1>Uplink Availability</h1>
      </div>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ color: '#ffc107', margin: 0 }}>{cat}</h2>
            <button onClick={() => handleDownloadImage(cat)} style={{ background: 'linear-gradient(135deg, #ffc107, #ff8c00)', color: '#222', fontWeight: 700, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}>📷 Download Table as Image</button>
          </div>
          <div ref={el => (tableRefs.current[cat] = el)} style={{ background: '#222', padding: 20, borderRadius: 12 }}>
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
                      <button onClick={() => handleViewIncidents(row.subValue)} style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}>View Incidents</button>
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
        <div className="modal" style={{ zIndex: 9999 }}>
          <div className="modal-content">
            <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2>Incidents for {modalUplink}</h2>
              <button
                onClick={async () => {
                  if (!modalTableRef.current) return;
                  const canvas = await html2canvas(modalTableRef.current, { backgroundColor: '#fff' });
                  const link = document.createElement('a');
                  link.download = `incidents-for-${modalUplink.replace(/\s/g, '_')}.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }}
                style={{ background: 'linear-gradient(135deg, #ffc107, #ff8c00)', color: '#222', fontWeight: 700, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}
              >
                📷 Download Image
              </button>
            </div>
            <table ref={modalTableRef} className="modal-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
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