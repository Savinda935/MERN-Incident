import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { subValues } from '../utils/subValues';
import '../css/AddIncident.css';

const AddIncident = () => {
  const [category, setCategory] = useState('');
  const [subValueOptions, setSubValueOptions] = useState([]);
  const [selectedSubValue, setSelectedSubValue] = useState('');
  const [message, setMessage] = useState('');
  const [formKey, setFormKey] = useState(Date.now());
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isCopyingFromPreviousMonth, setIsCopyingFromPreviousMonth] = useState(false);
  const [previousMonthData, setPreviousMonthData] = useState([]);

  useEffect(() => {
    if (category && subValues[category]) {
      setSubValueOptions(subValues[category]);
      setSelectedSubValue(''); // Reset sub-value when category changes
    } else {
      setSubValueOptions([]);
      setSelectedSubValue('');
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
      
      // Reset form completely
      setFormKey(Date.now());
      setCategory('');
      setSubValueOptions([]);
      setSelectedSubValue('');
      
      // Optionally, refresh incidents in parent if callback provided
      if (typeof window.refreshIncidents === 'function') window.refreshIncidents();
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    setCategory(selectedCategory);
    
    if (selectedCategory && subValues[selectedCategory]) {
      setSubValueOptions(subValues[selectedCategory]);
      setSelectedSubValue(''); // Reset sub-value selection
    } else {
      setSubValueOptions([]);
      setSelectedSubValue('');
    }
  };

  const handleSubValueChange = (e) => {
    setSelectedSubValue(e.target.value);
  };

  const handleBulkAddAll = async () => {
    if (!category || !subValueOptions.length) {
      setMessage('Please select a category first!');
      return;
    }

    setIsBulkAdding(true);
    setMessage('Adding all sub-values for ' + category + '...');

    try {
      const promises = subValueOptions.map((subValue, index) => {
        const incident = {
          id: Date.now() + index, // Unique ID for each
          category: category,
          subValue: subValue,
          downTimeDate: "-",
          upTimeDate: "-",
          downType: "Not Down",
          escalatedPerson: "-",
          remarks: "-",
        };
        return axios.post('http://localhost:5000/api/incidents', incident);
      });

      await Promise.all(promises);
      setMessage(`Successfully added all ${subValueOptions.length} sub-values for ${category}!`);
      
      // Reset form
      setCategory('');
      setSubValueOptions([]);
      setSelectedSubValue('');
      setFormKey(Date.now());
      
      // Optionally, refresh incidents in parent if callback provided
      if (typeof window.refreshIncidents === 'function') window.refreshIncidents();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error bulk adding: ' + error.message);
    } finally {
      setIsBulkAdding(false);
    }
  };

  const loadPreviousMonthData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/incidents');
      const allIncidents = response.data;
      
      // Get previous month
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthString = previousMonth.toISOString().slice(0, 7);
      
      // Filter incidents from previous month
      const previousMonthIncidents = allIncidents.filter(incident => {
        if (!incident.downTimeDate || incident.downTimeDate === '-') return false;
        const incidentMonth = incident.downTimeDate.slice(0, 7);
        return incidentMonth === previousMonthString;
      });
      
      setPreviousMonthData(previousMonthIncidents);
      setMessage(`Found ${previousMonthIncidents.length} incidents from ${previousMonthString}`);
    } catch (error) {
      setMessage('Error loading previous month data: ' + error.message);
    }
  };

  const copyFromPreviousMonth = async () => {
    if (previousMonthData.length === 0) {
      setMessage('No previous month data available. Please load data first.');
      return;
    }

    setIsCopyingFromPreviousMonth(true);
    setMessage('Copying incidents from previous month...');

    try {
      const promises = previousMonthData.map((incident, index) => {
        // Create new incident with current month dates
        const newIncident = {
          id: Date.now() + index,
          category: incident.category,
          subValue: incident.subValue,
          downTimeDate: incident.downTimeDate,
          upTimeDate: incident.upTimeDate,
          downType: incident.downType,
          escalatedPerson: incident.escalatedPerson,
          remarks: incident.remarks,
        };
        return axios.post('http://localhost:5000/api/incidents', newIncident);
      });

      await Promise.all(promises);
      setMessage(`Successfully copied ${previousMonthData.length} incidents from previous month!`);
      
      // Reset
      setPreviousMonthData([]);
      setFormKey(Date.now());
      
      // Optionally, refresh incidents in parent if callback provided
      if (typeof window.refreshIncidents === 'function') window.refreshIncidents();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error copying from previous month: ' + error.message);
    } finally {
      setIsCopyingFromPreviousMonth(false);
    }
  };

  return (
    <div className="container">
      <h1>Add NOC Incident</h1>
      
      {/* Previous Month Data Section */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '20px', 
        borderRadius: '15px', 
        marginBottom: '20px',
        border: '2px solid #28a745'
      }}>
        <h3 style={{ color: '#28a745', marginBottom: '15px' }}>📅 Copy from Previous Month</h3>
        <div className="form-group">
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Load and copy incidents from the previous month to the current month.
          </p>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={loadPreviousMonthData}
              style={{
                background: 'linear-gradient(135deg, #17a2b8, #138496)',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              📊 Load Previous Month Data
            </button>
            
            {previousMonthData.length > 0 && (
              <button 
                onClick={copyFromPreviousMonth}
                disabled={isCopyingFromPreviousMonth}
                style={{
                  background: 'linear-gradient(135deg, #28a745, #20c997)',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isCopyingFromPreviousMonth ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  opacity: isCopyingFromPreviousMonth ? 0.7 : 1
                }}
              >
                {isCopyingFromPreviousMonth ? 'Copying...' : `📋 Copy ${previousMonthData.length} Incidents`}
              </button>
            )}
          </div>
          
          {previousMonthData.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
                Found {previousMonthData.length} incidents from previous month:
              </p>
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto', 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                {previousMonthData.map((incident, index) => (
                  <div key={index} style={{ 
                    padding: '5px 0', 
                    borderBottom: index < previousMonthData.length - 1 ? '1px solid #eee' : 'none',
                    fontSize: '13px'
                  }}>
                    {index + 1}. {incident.category} - {incident.subValue} ({incident.downType})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bulk Add Section */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '20px', 
        borderRadius: '15px', 
        marginBottom: '20px',
        border: '2px solid #667eea'
      }}>
        <h3 style={{ color: '#667eea', marginBottom: '15px' }}>Bulk Add All Sub-Values</h3>
        <div className="form-group">
          <label htmlFor="bulkCategory">Select Category for Bulk Add:</label>
          <select 
            id="bulkCategory" 
            value={category}
            onChange={handleCategoryChange}
            style={{ marginBottom: '10px' }}
          >
            <option value="">Select Category</option>
            <option value="Core Switch">Core Switch</option>
            <option value="WAN Firewall">WAN Firewall</option>
            <option value="Access & Distribution Switches">Access & Distribution Switches</option>
          </select>
          
          {category && subValueOptions.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
                Found {subValueOptions.length} sub-values for {category}:
              </p>
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto', 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '7px',
                border: '1px solid #ddd'
              }}>
                {subValueOptions.map((subValue, index) => (
                  <div key={index} style={{ 
                    padding: '5px 0', 
                    borderBottom: index < subValueOptions.length - 1 ? '1px solid #eee' : 'none',
                    fontSize: '13px'
                  }}>
                    {index + 1}. {subValue}
                  </div>
                ))}
              </div>
              <button 
                type="button"
                onClick={handleBulkAddAll}
                disabled={isBulkAdding}
                style={{
                  background: 'linear-gradient(135deg, #28a745, #20c997)',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isBulkAdding ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  marginTop: '15px',
                  opacity: isBulkAdding ? 0.7 : 1
                }}
              >
                {isBulkAdding ? 'Adding...' : `Add All ${subValueOptions.length} Sub-Values`}
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} key={formKey}>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select 
            id="category" 
            name="category" 
            required 
            value={category}
            onChange={handleCategoryChange}
          >
            <option value="">Select Category</option>
            <option value="Core Switch">Core Switch</option>
            <option value="WAN Firewall">WAN Firewall</option>
            <option value="Access & Distribution Switches">Access & Distribution Switches</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="subValue">Sub-Value:</label>
          <select 
            id="subValue" 
            name="subValue" 
            required 
            value={selectedSubValue}
            onChange={handleSubValueChange}
            disabled={!category || subValueOptions.length === 0}
          >
            <option value="">
              {!category ? 'Select Category First' : subValueOptions.length === 0 ? 'No Sub-Values Available' : 'Select Sub-Value'}
            </option>
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