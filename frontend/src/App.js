import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, setupAuthInterceptor } from './utils/auth';
import AddIncident from './components/AddIncident';
import ViewIncidents from './components/ViewIncidents';
import MainLayout from './components/MainLayout';
import AvailabilityReport from './components/AvailabilityReport';
import Login from './components/Login';

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setupAuthInterceptor();
    const auth = isAuthenticated();
    setIsAuth(auth);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return isAuth ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setupAuthInterceptor();
    const auth = isAuthenticated();
    setIsAuth(auth);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return isAuth ? <Navigate to="/" replace /> : children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
        
        <Route path="/view" element={
          <ProtectedRoute>
            <ViewIncidents />
          </ProtectedRoute>
        } />
        
        <Route path="/add" element={
          <ProtectedRoute>
            <AddIncident />
          </ProtectedRoute>
        } />
        
        <Route path="/availability-report" element={
          <ProtectedRoute>
            <AvailabilityReport />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
