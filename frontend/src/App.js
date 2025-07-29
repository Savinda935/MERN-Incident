import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AddIncident from './components/AddIncident';
import ViewIncidents from './components/ViewIncidents';
import MainLayout from './components/MainLayout';
import AvailabilityReport from './components/AvailabilityReport';

import './App.css';


function App() {
  return (
    
    <Router>
      <Routes>
        {/* Use MainLayout for all sidebar-integrated pages */}
        <Route path="/*" element={<MainLayout />} />
        {/* Optionally add standalone routes if needed */}
        <Route path="/view" element={<ViewIncidents />} />
        <Route path="/add" element={<AddIncident />} />
        <Route path="/availability-report" element={<AvailabilityReport />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>

    
  );
}

export default App;
