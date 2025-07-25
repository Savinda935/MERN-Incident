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
    filterIncidents();
    calculateDowntimeAndAvailability();
  }, [incidents, categoryFilter, subValueFilter, downTypeFilter]);

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
      if (period === 'day' && incident.date !== today) return;
      if (period === 'month' && incident.date.slice(0, 7) !== thisMonth) return;

      const downTime = new Date(`${incident.date}T${incident.downTime}:00`);
      const upTime = new Date(`${incident.date}T${incident.upTime}:00`);
      let downtimeMinutes = (upTime - downTime) / (1000 * 60);

      if (non24x7SubValues.includes(incident.subValue)) {
        const startOfOperatingHours = new Date(`${incident.date}T08:00:00`);
        const endOfOperatingHours = new Date(`${incident.date}T17:00:00`);
        if (downTime < startOfOperatingHours) downTime.setTime(startOfOperatingHours.getTime());
        if (upTime > endOfOperatingHours) upTime.setTime(endOfOperatingHours.getTime());
        downtimeMinutes = (upTime - downTime) / (1000 * 60);
      }

      if (downtimeMinutes > 0) totalDowntime += downtimeMinutes;
    });

    return Math.round(totalDowntime);
  };

  const calculateAvailability = (incidents) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const thisMonth = now.toISOString().slice(0, 7);

    const uniqueSubValues = new Set(incidents.filter((i) => i.date.slice(0, 7) === thisMonth).map((i) => i.subValue));
    const subValueAvailabilities = {};

    uniqueSubValues.forEach((sv) => {
      const isNon24x7 = non24x7SubValues.includes(sv);
      const totalMinutes = isNon24x7 ? daysInMonth * 9 * 60 : daysInMonth * 24 * 60;
      let totalDowntime = 0;

      incidents.forEach((incident) => {
        if (incident.date.slice(0, 7) !== thisMonth || incident.subValue !== sv) return;
        const downTime = new Date(`${incident.date}T${incident.downTime}:00`);
        const upTime = new Date(`${incident.date}T${incident.upTime}:00`);
        let downtimeMinutes = (upTime - downTime) / (1000 * 60);

        if (isNon24x7) {
          const startOfOperatingHours = new Date(`${incident.date}T08:00:00`);
          const endOfOperatingHours = new Date(`${incident.date}T17:00:00`);
          if (downTime < startOfOperatingHours) downTime.setTime(startOfOperatingHours.getTime());
          if (upTime > endOfOperatingHours) upTime.setTime(endOfOperatingHours.getTime());
          downtimeMinutes = (upTime - downTime) / (1000 * 60);
        }

        if (downtimeMinutes > 0) totalDowntime += downtimeMinutes;
      });

      subValueAvailabilities[sv] = totalMinutes === 0 ? 100 : ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(2);
    });

    const count24x7 = [...uniqueSubValues].filter((sv) => !non24x7SubValues.includes(sv)).length;
    const countNon24x7 = [...uniqueSubValues].filter((sv) => non24x7SubValues.includes(sv)).length;
    const totalMinutes24x7 = count24x7 * daysInMonth * 24 * 60;
    const totalMinutesNon24x7 = countNon24x7 * daysInMonth * 9 * 60;
    let totalDowntime = 0;

    incidents.forEach((incident) => {
      if (incident.date.slice(0, 7) !== thisMonth) return;
      const downTime = new Date(`${incident.date}T${incident.downTime}:00`);
      const upTime = new Date(`${incident.date}T${incident.upTime}:00`);
      let downtimeMinutes = (upTime - downTime) / (1000 * 60);

      if (non24x7SubValues.includes(incident.subValue)) {
        const startOfOperatingHours = new Date(`${incident.date}T08:00:00`);
        const endOfOperatingHours = new Date(`${incident.date}T17:00:00`);
        if (downTime < startOfOperatingHours) downTime.setTime(startOfOperatingHours.getTime());
        if (upTime > endOfOperatingHours) upTime.setTime(endOfOperatingHours.getTime());
        downtimeMinutes = (upTime - downTime) / (1000 * 60);
      }

      if (downtimeMinutes > 0) totalDowntime += downtimeMinutes;
    });

    const totalMinutes = totalMinutes24x7 + totalMinutesNon24x7;
    const overallAvailability = totalMinutes === 0 ? 100 : ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(2);

    return { overall: overallAvailability, subValues: subValueAvailabilities };
  };

  const calculateDowntimeAndAvailability = () => {
    setDailyDowntime(calculateDowntime(filteredIncidents, 'day'));
    setMonthlyDowntime(calculateDowntime(filteredIncidents, 'month'));
    const availabilityData = calculateAvailability(filteredIncidents);
    setOverallAvailability(availabilityData.overall);
    setSubValueAvailabilities(availabilityData.subValues);
  };

  const filterIncidents = () => {
    const filtered = incidents.filter(
      (incident) =>
        (!categoryFilter || incident.category === categoryFilter) &&
        (!subValueFilter || incident.subValue === subValueFilter) &&
        (!downTypeFilter || incident.downType === downTypeFilter)
    );
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
    const updatedIncident = {
      id: parseInt(e.target.id.value),
      category: e.target.category.value,
      subValue: e.target.subValue.value,
      date: e.target.date.value,
      downTime: e.target.downTime.value,
      downType: e.target.downType.value,
      upTime: e.target.upTime.value,
      escalatedPerson: e.target.escalatedPerson.value,
      remarks: e.target.remarks.value,
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
        <p>Daily Downtime (Today): <span>{dailyDowntime}</span> minutes</p>
        <p>Monthly Downtime (This Month): <span>{monthlyDowntime}</span> minutes</p>
        <p>Overall Monthly Availability: <span>{overallAvailability}%</span></p>
      </div>
      <h3>Incidents</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Sub-Value</th>
            <th>Date</th>
            <th>Down Time</th>
            <th>Down Type</th>
            <th>Up Time</th>
            <th>Escalated Person</th>
            <th>Remarks</th>
            <th>Availability (%)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredIncidents.map((incident) => (
            <tr key={incident.id}>
              <td>{incident.category}</td>
              <td>{incident.subValue}</td>
              <td>{incident.date}</td>
              <td>{incident.downTime}</td>
              <td>{incident.downType}</td>
              <td>{incident.upTime}</td>
              <td>{incident.escalatedPerson}</td>
              <td>{incident.remarks || ''}</td>
              <td>{subValueAvailabilities[incident.subValue] || '100.00'}%</td>
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
                <label htmlFor="editDate">Date:</label>
                <input type="date" id="editDate" name="date" required defaultValue={editModal.incident.date} />
              </div>
              <div className="form-group">
                <label htmlFor="editDownTime">Down Time:</label>
                <input type="time" id="editDownTime" name="downTime" required defaultValue={editModal.incident.downTime} />
              </div>
              <div className="form-group">
                <label htmlFor="editDownType">Down Type:</label>
                <select id="editDownType" name="downType" required defaultValue={editModal.incident.downType}>
                  <option value="Planned">Planned Down</option>
                  <option value="Unplanned">Unplanned Down</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editUpTime">Up Time:</label>
                <input type="time" id="editUpTime" name="upTime" required defaultValue={editModal.incident.upTime} />
              </div>
              <div className="form-group">
                <label htmlFor="editEscalatedPerson">Escalated Person:</label>
                <input
                  type="text"
                  id="editEscalatedPerson"
                  name="escalatedPerson"
                  required
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
                  <th>Category</th>
                  <th>Sub-Value</th>
                  <th>Availability (%)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(subValueAvailabilities).map(([subValue, availability]) => (
                  <tr key={subValue}>
                    <td>{Object.keys(subValues).find((cat) => subValues[cat].includes(subValue)) || 'Unknown'}</td>
                    <td>{subValue}</td>
                    <td>{availability}%</td>
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

export default ViewIncidents;