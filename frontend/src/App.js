import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AddIncident from './components/AddIncident';
import ViewIncidents from './components/ViewIncidents';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AddIncident />} />
        <Route path="/view" element={<ViewIncidents />} />
      </Routes>
    </Router>
  );
}

export default App;
