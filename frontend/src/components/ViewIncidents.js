import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { subValues, non24x7SubValues } from '../utils/subValues';
import '../css/ViewIncidents.css'; // Assuming you have a CSS file for styling

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
    // Ignore storage errors (Safari private mode etc.)
  }
};

const ViewIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subValueFilter, setSubValueFilter] = useState('');
  const [downTypeFilter, setDownTypeFilter] = useState('');
  const [subValueOptions, setSubValueOptions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [editModal, setEditModal] = useState({ open: false, incident: null });
  const [availabilityModal, setAvailabilityModal] = useState(false);
  const [dailyDowntime, setDailyDowntime] = useState(0);
  const [monthlyDowntime, setMonthlyDowntime] = useState(0);
  const [overallAvailability, setOverallAvailability] = useState('100.00');
  const [subValueAvailabilities, setSubValueAvailabilities] = useState({});
  // Date range for availability calculations (persist per user)
  const [startDate, setStartDate] = useState(() => {
    const firstOfMonth = new Date(new Date().setDate(1)).toISOString().slice(0, 10);
    return getStoredDate('viewIncidentsStartDate', firstOfMonth);
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getStoredDate('viewIncidentsEndDate', today);
  });
  useEffect(() => {
    storeDate('viewIncidentsStartDate', startDate);
  }, [startDate]);

  useEffect(() => {
    storeDate('viewIncidentsEndDate', endDate);
  }, [endDate]);

  
  // Separate summary data for each category
  const [categorySummaries, setCategorySummaries] = useState({
    'Core Switch (Up Links)': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'WAN Firewall': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'Access & Distribution Switches': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'Access Points Availability': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'Advantis Sector Switches': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'Fabric Sector Switches': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
    'SAT Sector Switches': { dailyDowntime: 0, monthlyDowntime: 0, overallAvailability: '100.00', incidentCount: 0 },
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
  }, [incidents, categoryFilter, subValueFilter, downTypeFilter, searchText, startDate, endDate]);

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
        // Use selected date range instead of current month
        periodStart = new Date(`${startDate}T00:00:00`);
        periodEnd = new Date(`${endDate}T23:59:59`);
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
    // Use selected date range instead of current month
    const periodStart = new Date(`${startDate}T00:00:00`);
    const periodEnd = new Date(`${endDate}T23:59:59`);
    const totalMinutes = Math.ceil((periodEnd - periodStart) / (1000 * 60));
    const daysInRange = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));

    // Get unique sub-values that have any overlap with the selected period
    const uniqueSubValues = new Set();
    incidents.forEach(incident => {
      const down = incident.downTimeDate ? new Date(incident.downTimeDate) : null;
      const up = incident.upTimeDate ? new Date(incident.upTimeDate) : null;
      if (!down || !up) return;
      if (up >= periodStart && down <= periodEnd) {
        uniqueSubValues.add(incident.subValue);
      }
    });

    const subValueAvailabilities = {};

    uniqueSubValues.forEach((sv) => {
      let totalDowntime = 0;

      incidents.forEach((incident) => {
        if (!incident.downTimeDate || !incident.upTimeDate || incident.subValue !== sv) return;
        const down = new Date(incident.downTimeDate);
        const up = new Date(incident.upTimeDate);
        if (isNaN(down) || isNaN(up)) return;
        // Only consider overlap with selected period; clip to boundaries
        if (up >= periodStart && down <= periodEnd) {
          const clippedDown = down < periodStart ? periodStart : down;
          const clippedUp = up > periodEnd ? periodEnd : up;
          const minutes = (clippedUp - clippedDown) / (1000 * 60);
          if (minutes > 0) totalDowntime += minutes;
        }
      });

      subValueAvailabilities[sv] = totalMinutes === 0 ? 100 : ((totalMinutes - totalDowntime) / totalMinutes * 100).toFixed(2);
    });

    // Calculate overall availability for the selected period (clip to boundaries)
    let totalDowntime = 0;
    incidents.forEach((incident) => {
      if (!incident.downTimeDate || !incident.upTimeDate) return;
      const down = new Date(incident.downTimeDate);
      const up = new Date(incident.upTimeDate);
      if (isNaN(down) || isNaN(up)) return;
      if (up >= periodStart && down <= periodEnd) {
        const clippedDown = down < periodStart ? periodStart : down;
        const clippedUp = up > periodEnd ? periodEnd : up;
        const minutes = (clippedUp - clippedDown) / (1000 * 60);
        if (minutes > 0) totalDowntime += minutes;
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
    const categories = [
      'Core Switch (Up Links)',
      'WAN Firewall',
      'Access & Distribution Switches',
      'Access Points Availability',
      'Advantis Sector Switches',
      'Fabric Sector Switches',
      'SAT Sector Switches'
    ];
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
    
    const q = searchText.trim().toLowerCase();
    const filtered = incidents.filter((incident) => {
      const matchesFilters = (!categoryFilter || incident.category === categoryFilter) &&
        (!subValueFilter || incident.subValue === subValueFilter) &&
        (!downTypeFilter || incident.downType === downTypeFilter);
      if (!matchesFilters) return false;
      if (!q) return true;
      const haystack = [
        incident.category || '',
        incident.subValue || '',
        incident.downType || '',
        incident.escalatedPerson || '',
        incident.remarks || '',
        incident.downTimeDate || '',
        incident.upTimeDate || ''
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    
    console.log('Filtered incidents count:', filtered.length);
    setFilteredIncidents(filtered);
  };

  const handleDelete = async (id) => {
    const incident = incidents.find(inc => inc.id === id);
    if (!incident) {
      alert('Incident not found!');
      return;
    }

    const warningMessage = `⚠️ WARNING: You are about to delete this incident permanently!\n\n` +
      `Category: ${incident.category}\n` +
      `Sub-Value: ${incident.subValue}\n` +
      `Down Type: ${incident.downType}\n` +
      `Down Time: ${formatDateTime(incident.downTimeDate)}\n` +
      `Up Time: ${formatDateTime(incident.upTimeDate)}\n` +
      `Escalated Person: ${incident.escalatedPerson}\n` +
      `Remarks: ${incident.remarks || 'None'}\n\n` +
      `This action cannot be undone. Are you sure you want to delete this incident?`;

    if (!window.confirm(warningMessage)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/incidents/${id}`);
      alert('✅ Incident deleted successfully!');
      loadIncidents();
    } catch (error) {
      alert('❌ Error deleting incident: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (filteredIncidents.length === 0) {
      alert('No incidents to delete!');
      return;
    }

    const warningMessage = `⚠️ WARNING: You are about to delete ${filteredIncidents.length} incident(s) permanently!\n\n` +
      `This will delete all incidents that match your current filters:\n` +
      `• Category: ${categoryFilter || 'All'}\n` +
      `• Sub-Value: ${subValueFilter || 'All'}\n` +
      `• Down Type: ${downTypeFilter || 'All'}\n\n` +
      `This action cannot be undone. Are you sure you want to delete these incidents?`;

    if (!window.confirm(warningMessage)) {
      return;
    }

    try {
      const deletePromises = filteredIncidents.map(incident => 
        axios.delete(`http://localhost:5000/api/incidents/${incident.id}`)
      );
      
      await Promise.all(deletePromises);
      alert(`✅ Successfully deleted ${filteredIncidents.length} incident(s)!`);
      loadIncidents();
    } catch (error) {
      alert('❌ Error deleting incidents: ' + error.message);
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

  // Function to calculate planned and unplanned downtime for each sub-value (clip to selected date range)
  const calculateSubValueDowntime = () => {
    const periodStart = new Date(`${startDate}T00:00:00`);
    const periodEnd = new Date(`${endDate}T23:59:59`);
    const totalMinutesInPeriod = Math.ceil((periodEnd - periodStart) / (1000 * 60));

    const allSubValues = Array.from(new Set(incidents.map(i => i.subValue)));
    const subValueDowntime = {};

    allSubValues.forEach(subValue => {
      const subValueIncidents = incidents.filter(inc => 
        inc.subValue === subValue && inc.downTimeDate && inc.upTimeDate
      );

      let plannedDowntime = 0;
      let unplannedDowntime = 0;

      subValueIncidents.forEach(incident => {
        const down = new Date(incident.downTimeDate);
        const up = new Date(incident.upTimeDate);
        if (isNaN(down) || isNaN(up) || up <= down) return;
        // Only count overlap with selected period
        if (up >= periodStart && down <= periodEnd) {
          const clippedDown = down < periodStart ? periodStart : down;
          const clippedUp = up > periodEnd ? periodEnd : up;
          const minutes = (clippedUp - clippedDown) / (1000 * 60);
          if (minutes > 0) {
            if (incident.downType === 'Planned') plannedDowntime += minutes;
            else if (incident.downType === 'Unplanned') unplannedDowntime += minutes;
          }
        }
      });

      const totalDowntime = plannedDowntime + unplannedDowntime;
      const uptime = totalMinutesInPeriod - totalDowntime;
      const uptimePercentage = ((uptime / totalMinutesInPeriod) * 100).toFixed(2);
      const plannedPercentage = ((plannedDowntime / totalMinutesInPeriod) * 100).toFixed(2);
      const unplannedPercentage = ((unplannedDowntime / totalMinutesInPeriod) * 100).toFixed(2);

      subValueDowntime[subValue] = {
        uptime: uptimePercentage,
        plannedDowntime: Math.round(plannedDowntime),
        unplannedDowntime: Math.round(unplannedDowntime),
        totalDowntime: Math.round(totalDowntime),
        plannedPercentage: plannedPercentage,
        unplannedPercentage: unplannedPercentage,
        totalMinutesInPeriod: totalMinutesInPeriod
      };
    });

    return subValueDowntime;
  };

  // Function to download detailed downtime table as CSV
  const downloadDetailedDowntimeTable = () => {
    const periodLabel = `${startDate} to ${endDate}`;
    const subValueDowntime = calculateSubValueDowntime();
    
    // Create CSV content
    let csvContent = `Detailed Downtime Analysis - ${periodLabel}\n\n`;
    csvContent += `Uplink,Uptime (%),Downtime - Planned (%),Downtime - Unplanned (%),Total Downtime (Planned + Unplanned) (minutes),Remarks\n`;
    
    Object.entries(subValueDowntime).forEach(([subValue, data]) => {
      const remarks = [];
      if (data.plannedDowntime > 0) {
        remarks.push(`Planned : ${data.plannedDowntime} minutes`);
      }
      if (data.unplannedDowntime > 0) {
        remarks.push(`Unplanned : ${data.unplannedDowntime} minutes`);
      }
      
      const remarksText = remarks.length > 0 ? remarks.join('; ') : '-';
      
      csvContent += `${subValue},${data.uptime}%,${data.plannedPercentage}%,${data.unplannedPercentage}%,${data.totalDowntime} m,${remarksText}\n`;
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `detailed-downtime-analysis-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <h1>View NOC Incidents</h1>
      <div className="filter-group">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ color: '#fff', fontWeight: '500' }}>Date Range:</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '8px', border: '2px solid #3498db', borderRadius: '6px', fontSize: '14px' }}
          />
          <span style={{ color: '#ffc107', fontWeight: '600' }}>to</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '8px', border: '2px solid #3498db', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <input 
          type="text" 
          placeholder="Search incidents (category, sub-value, remarks, person, dates)" 
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <select onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="Core Switch (Up Links)">Core Switch (Up Links)</option>
          <option value="WAN Firewall">WAN Firewall</option>
          <option value="Access & Distribution Switches">Access & Distribution Switches</option>
          <option value="Access Points Availability">Access Points Availability</option>
          <option value="Advantis Sector Switches">Advantis Sector Switches</option>
          <option value="Fabric Sector Switches">Fabric Sector Switches</option>
          <option value="SAT Sector Switches">SAT Sector Switches</option>
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
        <button onClick={downloadDetailedDowntimeTable} style={{background: 'linear-gradient(135deg, #9b59b6, #8e44ad)'}}>
          📊 Download Detailed Table
        </button>
        <button 
          onClick={handleBulkDelete} 
          style={{
            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            color: 'white',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
          disabled={filteredIncidents.length === 0}
        >
          🗑️ Delete All ({filteredIncidents.length})
        </button>
      </div>
      <div id="summary">
        <h3>Summary</h3>
        
        {/* Overall Summary */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Overall Summary</h4>
          <p>Daily Downtime (Today): <span>{dailyDowntime}</span> minutes</p>
          <p>Period Downtime ({startDate} to {endDate}): <span>{monthlyDowntime}</span> minutes</p>
          <p>Overall Period Availability: <span>{overallAvailability}%</span></p>
          <p>Total Incidents: <span>{filteredIncidents.length}</span></p>
        </div>

        {/* Category-wise Summaries */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
          {/* Core Switch (Up Links) Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Core Switch (Up Links)</h4>
            <p>Daily Downtime: <span>{categorySummaries['Core Switch (Up Links)']?.dailyDowntime || 0}</span> minutes</p>
            <p>Period Downtime: <span>{categorySummaries['Core Switch (Up Links)']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['Core Switch (Up Links)']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['Core Switch (Up Links)']?.incidentCount || 0}</span></p>
          </div>

          {/* WAN Firewall Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>WAN Firewall</h4>
            <p>Daily Downtime: <span>{categorySummaries['WAN Firewall']?.dailyDowntime || 0}</span> minutes</p>
            <p>Period Downtime: <span>{categorySummaries['WAN Firewall']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['WAN Firewall']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['WAN Firewall']?.incidentCount || 0}</span></p>
          </div>

          {/* Access & Distribution Switches Summary */}   
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Access & Distribution Switches</h4>
            <p>Daily Downtime: <span>{categorySummaries['Access & Distribution Switches']?.dailyDowntime || 0}</span> minutes</p>
            <p>Period Downtime: <span>{categorySummaries['Access & Distribution Switches']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['Access & Distribution Switches']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['Access & Distribution Switches']?.incidentCount || 0}</span></p>
          </div>

          {/* Access Points Availability Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Access Points Availability</h4>
            <p>Daily Downtime: <span>{categorySummaries['Access Points Availability']?.dailyDowntime || 0}</span> minutes</p>
            <p>Period Downtime: <span>{categorySummaries['Access Points Availability']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['Access Points Availability']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['Access Points Availability']?.incidentCount || 0}</span></p>
          </div>

          {/* Advantis Sector Switches Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Advantis Sector Switches</h4>
            <p>Daily Downtime: <span>{categorySummaries['Advantis Sector Switches']?.dailyDowntime || 0}</span> minutes</p>
            <p>Period Downtime: <span>{categorySummaries['Advantis Sector Switches']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['Advantis Sector Switches']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['Advantis Sector Switches']?.incidentCount || 0}</span></p>
          </div>

          {/* Fabric Sector Switches Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Fabric Sector Switches</h4>
            <p>Daily Downtime: <span>{categorySummaries['Fabric Sector Switches']?.dailyDowntime || 0}</span> minutes</p>
            <p>Period Downtime: <span>{categorySummaries['Fabric Sector Switches']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['Fabric Sector Switches']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['Fabric Sector Switches']?.incidentCount || 0}</span></p>
          </div>

          {/* SAT Sector Switches Summary */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>SAT Sector Switches</h4>
            <p>Daily Downtime: <span>{categorySummaries['SAT Sector Switches']?.dailyDowntime || 0}</span> minutes</p>
            <p>Period Downtime: <span>{categorySummaries['SAT Sector Switches']?.monthlyDowntime || 0}</span> minutes</p>
            <p>Availability: <span>{categorySummaries['SAT Sector Switches']?.overallAvailability || '100.00'}%</span></p>
            <p>Incidents: <span>{categorySummaries['SAT Sector Switches']?.incidentCount || 0}</span></p>
          </div>
        </div>
      </div>
      
      {/* Detailed Downtime Analysis Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Detailed Downtime Analysis ({startDate} to {endDate})</h3>
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #34495e, #2c3e50)' }}>
                <th style={{ color: 'black', padding: '15px 12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Uplink</th>
                <th style={{ color: 'black', padding: '15px 12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Uptime (%)</th>
                <th style={{ color: 'black', padding: '15px 12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Downtime - Planned (%)</th>
                <th style={{ color: 'black', padding: '15px 12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Downtime - Unplanned (%)</th>
                <th style={{ color: 'black', padding: '15px 12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Total Downtime (Planned + Unplanned) (minutes)</th>
                <th style={{ color: 'black', padding: '15px 12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(calculateSubValueDowntime()).map(([subValue, data]) => {
                const remarks = [];
                if (data.plannedDowntime > 0) {
                  remarks.push(`Planned : ${data.plannedDowntime} minutes`);
                }
                if (data.unplannedDowntime > 0) {
                  remarks.push(`Unplanned : ${data.unplannedDowntime} minutes`);
                }
                const remarksText = remarks.length > 0 ? remarks.join('; ') : '-';
                
                return (
                  <tr key={subValue} style={{ borderBottom: '1px solid #e1e8ed' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{subValue}</td>
                    <td style={{ 
                      padding: '12px', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: parseFloat(data.uptime) === 100 ? '#27ae60' : '#e74c3c'
                    }}>
                      {data.uptime}%
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{data.plannedPercentage}%</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{data.unplannedPercentage}%</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{data.totalDowntime} m</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{remarksText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
            {/* Remove Daily Availability column and add Period Availability column */}
            <th>Period Availability (%)</th>
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
              {/* Show period availability for the incident's subValue */}
              <td>{subValueAvailabilities[incident.subValue] || '100.00'}%</td>
              <td>
                <button
                  onClick={() =>
                    setEditModal({ open: true, incident })
                  }
                  style={{
                    background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                    color: 'white',
                    padding: '6px 12px',
                    margin: '0 3px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => handleDelete(incident.id)}
                  style={{
                    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                    color: 'white',
                    padding: '6px 12px',
                    margin: '0 3px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🗑️ Delete
                </button>
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
                  <option value="Core Switch (Up Links)">Core Switch (Up Links)</option>
                  <option value="WAN Firewall">WAN Firewall</option>
                  <option value="Access & Distribution Switches">Access & Distribution Switches</option>
                  <option value="Access Points Availability">Access Points Availability</option>
                  <option value="Advantis Sector Switches">Advantis Sector Switches</option>
                  <option value="Fabric Sector Switches">Fabric Sector Switches</option>
                  <option value="SAT Sector Switches">SAT Sector Switches</option>
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
            <h2>Sub-Value Availability ({startDate} to {endDate})</h2>
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