import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AddIncident from './components/AddIncident';
import ViewIncidents from './components/ViewIncidents';
import MainLayout from './components/MainLayout';
import AvailabilityReport from './components/AvailabilityReport';
import UplinkAvailabilityTable from './components/UplinkAvailabilityTable';
import AddIssue from './components/VcenterAvamar/AddIssue';
import ViewIssue from './components/VcenterAvamar/ViewIssue';
import SectorSummary from './components/SectorSummary';

import Login from './components/authentication/Login';
import Register from './components/authentication/Register';

import './App.css';

// Protected Route - redirects to login if not authenticated
const ProtectedRoute = ({ element }) => {
  const token = localStorage.getItem("token");
  return token ? element : <Navigate to="/login" replace />;
};

// Public Route - redirects to home if already authenticated
const PublicRoute = ({ element }) => {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/" replace /> : element;
};

function App() {
  return (
    <Router>
      <Routes>

        {/* --- Authentication Pages --- */}
        <Route path="/login" element={<PublicRoute element={<Login />} />} />
        <Route path="/register" element={<PublicRoute element={<Register />} />} />

        {/* --- Main App Routes --- */}
        <Route path="/" element={<ProtectedRoute element={<MainLayout />} />} />
        <Route path="/view" element={<ProtectedRoute element={<ViewIncidents />} />} />
        <Route path="/add" element={<ProtectedRoute element={<AddIncident />} />} />
        <Route path="/availability-report" element={<ProtectedRoute element={<AvailabilityReport />} />} />
        <Route path="/uplink-availability" element={<ProtectedRoute element={<UplinkAvailabilityTable />} />} />
        <Route path="/sector-summary" element={<ProtectedRoute element={<SectorSummary />} />} />
        <Route path="/vcenter-avamar/add" element={<ProtectedRoute element={<AddIssue />} />} />
        <Route path="/vcenter-avamar/view" element={<ProtectedRoute element={<ViewIssue />} />} />

      </Routes>
    </Router>
  );
}

export default App;
