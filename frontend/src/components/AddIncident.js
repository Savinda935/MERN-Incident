import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { subValues } from '../utils/subValues';
import '../css/AddIncident.css'; // Assuming you have a CSS file for styling


const AddIncident = () => {
  const [category, setCategory] = useState('');
  const [subValueOptions, setSubValueOptions] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (category && subValues[category]) {
      setSubValueOptions(subValues[category]);
    } else {
      setSubValueOptions([]);
    }
  }, [category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const incident = {
      id: Date.now(),
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
      const response = await axios.post('http://localhost:5000/api/incidents', incident);
      setMessage(response.data.message);
      e.target.reset();
      setSubValueOptions([]);
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Add NOC Incident</h1>
      <form onSubmit={handleSubmit}>
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
          <label htmlFor="date">Date:</label>
          <input type="date" id="date" name="date" required />
        </div>
        <div className="form-group">
          <label htmlFor="downTime">Down Time:</label>
          <input type="time" id="downTime" name="downTime" required />
        </div>
        <div className="form-group">
          <label htmlFor="downType">Down Type:</label>
          <select id="downType" name="downType" required>
            <option value="Planned">Planned Down</option>
            <option value="Unplanned">Unplanned Down</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="upTime">Up Time:</label>
          <input type="time" id="upTime" name="upTime" required />
        </div>
        <div className="form-group">
          <label htmlFor="escalatedPerson">Escalated Person:</label>
          <input type="text" id="escalatedPerson" name="escalatedPerson" required />
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