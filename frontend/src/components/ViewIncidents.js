import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { subValues, non24x7SubValues } from '../utils/subValues';
import '../css/ViewIncidents.css'; // Assuming you have a CSS file for styling

const ViewIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subValueFilter, setSubValueFilter] = useState('');
  const [downTypeFilter, setDownTypeFilter] = useState('');
  const [subValueOptions, setSubValueOptions] = useState([]);
  const [editModal, setEditModal] = useState({ open: false, incident: null });
  const [availabilityModal, setAvailabilityModal] = useState(false);
  const [dailyDowntime, setDailyDowntime] = useState(0);
  const [monthlyDowntime, setMonthlyDowntime] = useState(0);
  const [overallAvailability, setOverallAvailability] = useState('100.00');
  const [subValueAvailabilities, setSubValueAvailabilities] = useState({});
  
  // Separate summary data for each category
  const [categorySummaries, setCategorySummaries] = useState({
    'Core Switch': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'WAN Firewall': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'Access & Distribution Switches': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 }
  });

  useEffect(() => {
    loadIncidents();
  }, []);

  useEffect(() => {
    if (categoryFilter && subValues[categoryFilter]) {
      setSubValueOptions(subValues[categoryFilter]);
    } else {
      setSubValueOptions([]);
    }
  }, [categoryFilter]);

  useEffect(() => {
    console.log('Filters changed, recalculating...', { categoryFilter, subValueFilter, downTypeFilter });
    filterIncidents();
    calculateDowntimeAndAvailability();
  }, [incidents, categoryFilter, subValueFilter, downTypeFilter]);

  useEffect(() => {
    if (editModal.open && editModal.incident) {
      if (subValues[editModal.incident.category]) {
        setSubValueOptions(subValues[editModal.incident.category]);
      }
    }
  }, [editModal]);

  const loadIncidents = async () => {
    try { 
      const response = await axios.get('http://localhost:5000/api/incidents');
      setIncidents(response.data);
      setFilteredIncidents(response.data);
    } catch (error) {
      console.error('Error loading incidents:', error);
    }
  };

  const calculateDowntime = (incidents, period) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = now.toISOString().slice(0, 7);
    let totalDowntime = 0;

    incidents.forEach((incident) => {
      const downTime = incident.downTimeDate ? new Date(incident.downTimeDate) : null;
      const upTime = incident.upTimeDate ? new Date(incident.upTimeDate) : null;
      
      if (!downTime) return;

      // Determine the effective end time
      let effectiveEndTime = upTime;
      if (!upTime || upTime > now) {
        effectiveEndTime = now; // For ongoing incidents, use current time
      }

      // Calculate the period boundaries
      let periodStart, periodEnd;
      if (period === 'day') {
        periodStart = new Date(today + 'T00:00:00');
        periodEnd = new Date(today + 'T23:59:59');
      } else if (period === 'month') {
        const year = now.getFullYear();
        const month = now.getMonth();
        periodStart = new Date(year, month, 1);
        periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
      }

      // Check if incident overlaps with the period
      if (downTime <= periodEnd && effectiveEndTime >= periodStart) {
        // Calculate the overlap
        const overlapStart = new Date(Math.max(downTime.getTime(), periodStart.getTime()));
        const overlapEnd = new Date(Math.min(effectiveEndTime.getTime(), periodEnd.getTime()));
        
        if (overlapEnd > overlapStart) {
          const downtimeMinutes = (overlapEnd - overlapStart) / (1000 * 60);
          if (downtimeMinutes > 0) {
            totalDowntime += downtimeMinutes;
          }
        }
      }
    });

    return Math.round(totalDowntime);
  };

  const calculateAvailability = (incidents) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const thisMonth = now.toISOString().slice(0, 7);

    // Get unique sub-values for this month
    const uniqueSubValues = new Set();
    incidents.forEach(incident => {
      if (incident.downTimeDate) {
        const incidentMonth = incident.downTimeDate.slice(0, 7);
        if (incidentMonth === thisMonth) {
          uniqueSubValues.add(incident.subValue);
        }
      }
    });

    const subValueAvailabilities = {};

    uniqueSubValues.forEach((sv) => {
      const totalMinutes = daysInMonth * 24 * 60; // Total minutes in the month
      let totalDowntime = 0;

      incidents.forEach((incident) => {
        if (!incident.downTimeDate || incident.subValue !== sv) return;
        
        const incidentMonth = incident.downTimeDate.slice(0, 7);
        if (incidentMonth !== thisMonth) return;

        const downTime = new Date(incident.downTimeDate);
        const upTime = incident.upTimeDate ? new Date(incident.upTimeDate) : now;
        
        if (isNaN(downTime.getTime())) return;

        // Calculate downtime for this incident
        const downtimeMinutes = (upTime - downTime) / (1000 * 60);
        if (downtimeMinutes > 0) {
          totalDowntime += downtimeMinutes;
        }
      });

      subValueAvailabilities[sv] = totalMinutes === 0 ? 100 : ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(2);
    });

    // Calculate overall availability for the month
    const totalMinutes = daysInMonth * 24 * 60; // Total minutes in the month
    let totalDowntime = 0;

    incidents.forEach((incident) => {
      if (!incident.downTimeDate) return;
      
      const incidentMonth = incident.downTimeDate.slice(0, 7);
      if (incidentMonth !== thisMonth) return;

      const downTime = new Date(incident.downTimeDate);
      const upTime = incident.upTimeDate ? new Date(incident.upTimeDate) : now;
      
      if (isNaN(downTime.getTime())) return;

      // Calculate downtime for this incident
      const downtimeMinutes = (upTime - downTime) / (1000 * 60);
      if (downtimeMinutes > 0) {
        totalDowntime += downtimeMinutes;
      }
    });

    const overallAvailability = totalMinutes === 0 ? 100 : ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(2);

    return { overall: overallAvailability, subValues: subValueAvailabilities };
  };

  const calculateDowntimeAndAvailability = () => {
    console.log('Calculating downtime and availability for filtered incidents:', filteredIncidents.length);
    console.log('Active filters:', { categoryFilter, subValueFilter, downTypeFilter });
    
    const daily = calculateDowntime(filteredIncidents, 'day');
    const monthly = calculateDowntime(filteredIncidents, 'month');
    const availabilityData = calculateAvailability(filteredIncidents);
    
    console.log('Calculated values:', { daily, monthly, overall: availabilityData.overall });
    
    setDailyDowntime(daily);
    setMonthlyDowntime(monthly);
    setOverallAvailability(availabilityData.overall);
    setSubValueAvailabilities(availabilityData.subValues);
    
    // Calculate summary for each category
    calculateCategorySummaries();
  };

  const calculateCategorySummaries = () => {
    const categories = ['Core Switch', 'WAN Firewall', 'Access & Distribution Switches'];
    const newCategorySummaries = {};
    
    categories.forEach(category => {
      const categoryIncidents = incidents.filter(incident => incident.category === category);
      
      const dailyDowntime = calculateDowntime(categoryIncidents, 'day');
      const monthlyDowntime = calculateDowntime(categoryIncidents, 'month');
      const availabilityData = calculateAvailability(categoryIncidents);
      
      newCategorySummaries[category] = {
        dailyDowntime,
        monthlyDowntime,
        overallAvailability: availabilityData.overall,
        incidentCount: categoryIncidents.length
      };
    });
    
    console.log('Category summaries:', newCategorySummaries);
    setCategorySummaries(newCategorySummaries);
  };

  const filterIncidents = () => {
    console.log('Filtering incidents with:', { categoryFilter, subValueFilter, downTypeFilter });
    console.log('Total incidents before filtering:', incidents.length);
    
    const filtered = incidents.filter(
      (incident) =>
        (!categoryFilter || incident.category === categoryFilter) &&
        (!subValueFilter || incident.subValue === subValueFilter) &&
        (!downTypeFilter || incident.downType === downTypeFilter)
    );
    
    console.log('Filtered incidents count:', filtered.length);
    setFilteredIncidents(filtered);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/incidents/${id}`);
      alert('Incident deleted successfully');
      loadIncidents();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const getValueOrDash = (name) => e.target[name].value ? e.target[name].value : "-";
    const updatedIncident = {
      id: parseInt(e.target.id.value),
      category: e.target.category.value,
      subValue: e.target.subValue.value,
      downTimeDate: getValueOrDash("downTimeDate"),
      upTimeDate: getValueOrDash("upTimeDate"),
      downType: getValueOrDash("downType"),
      escalatedPerson: getValueOrDash("escalatedPerson"),
      remarks: getValueOrDash("remarks"),
    };

    try {
      await axios.put(`http://localhost:5000/api/incidents/${updatedIncident.id}`, updatedIncident);
      alert('Incident updated successfully');
      setEditModal({ open: false, incident: null });
      loadIncidents();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  function getTimeDiffInMinutes(start, end) {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    let diff = (endDate - startDate) / 60000; // in minutes
    if (diff < 0) diff += 24 * 60; // handle overnight (shouldn't happen with datetime-local)
    return diff;
  }

  function getSubValueDownTypeTimes(incidents, subValue) {
    let planned = 0, unplanned = 0;
    incidents.forEach(inc => {
      if (inc.subValue !== subValue) return;
      const diff = getTimeDiffInMinutes(inc.downTimeDate, inc.upTimeDate);
      if (inc.downType === "Planned") planned += diff;
      else if (inc.downType === "Unplanned") unplanned += diff;
    });
    return { planned, unplanned, total: planned + unplanned };
  }

  function getTotalDownTimeForSubValue(incidents, subValue) {
    return incidents
      .filter(inc => inc.subValue === subValue)
      .reduce((sum, inc) => sum + getTimeDiffInMinutes(inc.downTimeDate, inc.upTimeDate), 0);
  }

  let plannedTime = 0;
  let unplannedTime = 0;

  incidents.forEach(inc => {
    const diff = getTimeDiffInMinutes(inc.downTimeDate, inc.upTimeDate);
    if (inc.downType === "Planned") plannedTime += diff;
    else if (inc.downType === "Unplanned") unplannedTime += diff;
  });

  const totalTime = plannedTime + unplannedTime;
  const plannedPercent = totalTime ? ((plannedTime / totalTime) * 100).toFixed(2) : 0;
  const unplannedPercent = totalTime ? ((unplannedTime / totalTime) * 100).toFixed(2) : 0;

  // Helper to format datetime as 'YYYY-MM-DD hh:mm AM/PM'
  function formatDateTime(dtString) {
    if (!dtString || dtString === '-') return '-';
    const date = new Date(dtString);
    if (isNaN(date)) return dtString;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${year}-${month}-${day} ${hours}:${minutes} ${ampm}`;
  }

  function formatDuration(downTimeDate, upTimeDate) {
    if (!downTimeDate || !upTimeDate || downTimeDate === '-' || upTimeDate === '-') return '-';
    const down = new Date(downTimeDate);
    const up = new Date(upTimeDate);
    let diffMs = up - down;
    if (isNaN(diffMs) || diffMs < 0) return '-';
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    let result = '';
    if (days > 0) result += `${days} days `;
    if (hours > 0) result += `${hours} hours `;
    result += `${minutes} minutes`;
    return result.trim();
  }

  // Function to calculate individual incident availability
  function calculateIncidentAvailability(incident) {
    if (!incident.downTimeDate || !incident.upTimeDate || 
        incident.downTimeDate === '-' || incident.upTimeDate === '-') {
      return '100.00';
    }

    const downTime = new Date(incident.downTimeDate);
    const upTime = new Date(incident.upTimeDate);
    
    if (isNaN(downTime) || isNaN(upTime) || upTime <= downTime) {
      return '100.00';
    }

    // Calculate downtime in minutes
    const downtimeMinutes = (upTime - downTime) / (1000 * 60);
    
    // For individual incidents, calculate availability based on a 24-hour period
    // This shows the impact of this incident on a daily availability metric
    const totalMinutesInDay = 24 * 60; // 1440 minutes
    const availability = Math.max(0, ((totalMinutesInDay - downtimeMinutes) / totalMinutesInDay * 100)).toFixed(2);
    
    return availability;
  }

  // Function to get CSS class for down type
  function getDownTypeClass(downType) {
    if (!downType) return '';
    
    const type = downType.toLowerCase();
    if (type === 'not down') return 'down-type not-down';
    if (type === 'planned') return 'down-type planned';
    if (type === 'unplanned') return 'down-type unplanned';
    
    return 'down-type planned'; // default to planned for unknown types
  }

  return (
    <div className="container">
      <h1>View NOC Incidents</h1>
      <div className="filter-group">
        <select onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="Core Switch">Core Switch</option>
          <option value="WAN Firewall">WAN Firewall</option>
          <option value="Access & Distribution Switches">Access & Distribution Switches</option>
        </select>
        <select onChange={(e) => setSubValueFilter(e.target.value)}>
          <option value="">All Sub-Values</option>
          {subValueOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select onChange={(e) => setDownTypeFilter(e.target.value)}>
          <option value="">All Down Types</option>
          <option value="Planned">Planned Down</option>
          <option value="Unplanned">Unplanned Down</option>
        </select>
        <button onClick={() => setAvailabilityModal(true)}>Availability</button>
      </div>
      <div id="summary">
        <h3>Summary</h3>
        
        {/* Overall Summary */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Overall Summary</h4>
          <p>Daily Downtime (Today): <span>{dailyDowntime}</span> minutes</p>
          <p>Monthly Downtime (This Month): <span>{monthlyDowntime}</span> minutes</p>
          <p>Overall Monthly Availability: <span>{overallAvailability}%</span></p>
          <p>Total Incidents: <span>{filteredIncidents.length}</span></p>
        </div>

        {/* Category-wise Summaries */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
          {/* Core Switch Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Core Switch</h4>
            <p>Daily Downtime: <span>{categorySummaries['Core Switch']?.dailyDowntime || 0}</span> minutes</p>
            <p>Monthly Downtime: <span>{categorySummaries['Core Switch']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['Core Switch']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['Core Switch']?.incidentCount || 0}</span></p>
          </div>

          {/* WAN Firewall Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>WAN Firewall</h4>
            <p>Daily Downtime: <span>{categorySummaries['WAN Firewall']?.dailyDowntime || 0}</span> minutes</p>
            <p>Monthly Downtime: <span>{categorySummaries['WAN Firewall']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['WAN Firewall']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['WAN Firewall']?.incidentCount || 0}</span></p>
          </div>

          {/* Access & Distribution Switches Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Access & Distribution Switches</h4>
            <p>Daily Downtime: <span>{categorySummaries['Access & Distribution Switches']?.dailyDowntime || 0}</span> minutes</p>
            <p>Monthly Downtime: <span>{categorySummaries['Access & Distribution Switches']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['Access & Distribution Switches']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['Access & Distribution Switches']?.incidentCount || 0}</span></p>
          </div>
        </div>
      </div>
      <h3>Incidents</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Sub-Value</th>
            <th>Down Time Date & Time</th>
            <th>Down Type</th>
            <th>Up Time Date & Time</th>
            <th>Days Down</th>
            <th>Escalated Person</th>
            <th>Remarks</th>
            <th>Daily Availability (%)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredIncidents.map((incident) => (
            <tr key={incident.id}>
              <td>{incident.category}</td>
              <td>{incident.subValue}</td>
              <td>{formatDateTime(incident.downTimeDate)}</td>
              <td className={getDownTypeClass(incident.downType)}>{incident.downType}</td>
              <td>{formatDateTime(incident.upTimeDate)}</td>
              <td>{formatDuration(incident.downTimeDate, incident.upTimeDate)}</td>
              <td>{incident.escalatedPerson}</td>
              <td>{incident.remarks || ''}</td>
              <td>{calculateIncidentAvailability(incident)}%</td>
              <td>
                <button
                  onClick={() =>
                    setEditModal({ open: true, incident })
                  }
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(incident.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {/* Planned/Unplanned percentage summary row removed as per user request */}
        </tfoot>
      </table>
      <p>
        <a href="/">Add New Incident</a>
      </p>

      {editModal.open && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setEditModal({ open: false, incident: null })}>
              ×
            </span>
            <h2>Edit Incident</h2>
            <form onSubmit={handleEditSubmit}>
              <input type="hidden" name="id" value={editModal.incident.id} />
              <div className="form-group">
                <label htmlFor="editCategory">Category:</label>
                <select
                  id="editCategory"
                  name="category"
                  required
                  defaultValue={editModal.incident.category}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Select Category</option>
                  <option value="Core Switch">Core Switch</option>
                  <option value="WAN Firewall">WAN Firewall</option>
                  <option value="Access & Distribution Switches">Access & Distribution Switches</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editSubValue">Sub-Value:</label>
                <select id="editSubValue" name="subValue" required defaultValue={editModal.incident.subValue}>
                  <option value="">Select Sub-Value</option>
                  {subValueOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editDownTimeDate">Down Time Date & Time:</label>
                <input type="datetime-local" id="editDownTimeDate" name="downTimeDate" defaultValue={editModal.incident.downTimeDate} />
              </div>
              <div className="form-group">
                <label htmlFor="editDownType">Down Type:</label>
                <select id="editDownType" name="downType" defaultValue={editModal.incident.downType}>
                  <option value="Planned">Planned Down</option>
                  <option value="Unplanned">Unplanned Down</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editUpTimeDate">Up Time Date & Time:</label>
                <input type="datetime-local" id="editUpTimeDate" name="upTimeDate" defaultValue={editModal.incident.upTimeDate} />
              </div>
              <div className="form-group">
                <label htmlFor="editEscalatedPerson">Escalated Person:</label>
                <input
                  type="text"
                  id="editEscalatedPerson"
                  name="escalatedPerson"
                  defaultValue={editModal.incident.escalatedPerson}
                />
              </div>
              <div className="form-group">
                <label htmlFor="editRemarks">Remarks:</label>
                <textarea id="editRemarks" name="remarks" defaultValue={editModal.incident.remarks}></textarea>
              </div>
              <button type="submit">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {availabilityModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setAvailabilityModal(false)}>
              ×
            </span>
            <h2>Sub-Value Availability (This Month)</h2>
            <table>
              <thead>
                <tr>
                  <th>Sub-Value</th>
                  <th>Total Down Time (min)</th>
                  <th>100%</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(incidents.map(i => i.subValue))).map(subValue => {
                  const totalDownTime = getTotalDownTimeForSubValue(incidents, subValue);
                  return (
                    <tr key={subValue}>
                      <td>{subValue}</td>
                      <td>{totalDownTime} minutes</td>
                      <td>100%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewIncidents;