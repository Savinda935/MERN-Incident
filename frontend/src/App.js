import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AddIncident from './components/AddIncident';
import ViewIncidents from './components/ViewIncidents';
import MainLayout from './components/MainLayout';
import AvailabilityReport from './components/AvailabilityReport';
import UplinkAvailabilityTable from './components/UplinkAvailabilityTable';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/view" element={<ViewIncidents />} />
        <Route path="/add" element={<AddIncident />} />
        <Route path="/availability-report" element={<AvailabilityReport />} />
        <Route path="/uplink-availability" element={<UplinkAvailabilityTable />} />
      </Routes>
    </Router>
  );
}

export default App;
