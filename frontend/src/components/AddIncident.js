import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { subValues } from '../utils/subValues';
import '../css/AddIncident.css'; // Assuming you have a CSS file for styling


const AddIncident = () => {
  const [category, setCategory] = useState('');
  const [subValueOptions, setSubValueOptions] = useState([]);
  const [message, setMessage] = useState('');
  const [formKey, setFormKey] = useState(Date.now()); // for resetting form

  useEffect(() => {
    if (category && subValues[category]) {
      setSubValueOptions(subValues[category]);
    } else {
      setSubValueOptions([]);
    }
  }, [category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const getValueOrDash = (name) => e.target[name].value ? e.target[name].value : "-";
    const incident = {
      id: Date.now(),
      category: e.target.category.value,
      subValue: e.target.subValue.value,
      downTimeDate: getValueOrDash("downTimeDate"),
      upTimeDate: getValueOrDash("upTimeDate"),
      downType: getValueOrDash("downType"),
      escalatedPerson: getValueOrDash("escalatedPerson"),
      remarks: getValueOrDash("remarks"),
    };

    try {
      const response = await axios.post('http://localhost:5000/api/incidents', incident);
      setMessage(response.data.message || 'Incident added successfully!');
      setFormKey(Date.now()); // reset form
      setSubValueOptions([]);
      setCategory('');
      // Optionally, refresh incidents in parent if callback provided
      if (typeof window.refreshIncidents === 'function') window.refreshIncidents();
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Add NOC Incident</h1>
      <form onSubmit={handleSubmit} key={formKey}>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select id="category" name="category" required onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select Category</option>
            <option value="Core Switch">Core Switch</option>
            <option value="WAN Firewall">WAN Firewall</option>
            <option value="Access & Distribution Switches">Access & Distribution Switches</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="subValue">Sub-Value:</label>
          <select id="subValue" name="subValue" required>
            <option value="">Select Sub-Value</option>
            {subValueOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="downTimeDate">Down Time Date & Time:</label>
          <input type="datetime-local" id="downTimeDate" name="downTimeDate" />
        </div>
        <div className="form-group">
          <label htmlFor="upTimeDate">Up Time Date & Time:</label>
          <input type="datetime-local" id="upTimeDate" name="upTimeDate" />
        </div>
        <div className="form-group">
          <label htmlFor="downType">Down Type:</label>
          <select id="downType" name="downType">
            <option value="Planned">Planned Down</option>
            <option value="Unplanned">Unplanned Down</option>
            <option value="Not Down">Not Down</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="escalatedPerson">Escalated Person:</label>
          <input type="text" id="escalatedPerson" name="escalatedPerson" />
        </div>
        <div className="form-group">
          <label htmlFor="remarks">Remarks:</label>
          <textarea id="remarks" name="remarks"></textarea>
        </div>
        <button type="submit">Submit Incident</button>
      </form>
      <p>
        <a href="/view">View Incidents</a>
      </p>
      <p>{message}</p>
    </div>
  );
};

export default AddIncident;