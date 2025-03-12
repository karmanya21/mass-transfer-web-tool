// App.js - Main Application Component
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './components/HomePage';
import SimulatorIntro from './components/SimulatorIntro';
import EquimolarDiffusionSimulator from './components/simulators/EquimolarDiffusionSimulator';
import './App.css';

// Data for the simulators
const simulators = [
  {
    id: 'equimolar-diffusion',
    title: 'Equimolar Counter Diffusion',
    description: 'Visualization of two species diffusing in opposite directions with equal molar flux.',
    path: '/simulators/equimolar-diffusion'
  },
  {
    id: 'stagnant-film',
    title: 'Diffusion in Stagnant Film',
    description: 'Simulation of diffusion through a stationary medium.',
    path: '/simulators/stagnant-film'
  },
  // Other simulators would be added here
];

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar simulators={simulators} />
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/simulators/equimolar-diffusion" 
              element={<SimulatorIntro 
                simulator={simulators[0]} 
                simulatorPath="/simulators/equimolar-diffusion/simulate"
              />} 
            />
            <Route 
              path="/simulators/equimolar-diffusion/simulate" 
              element={<EquimolarDiffusionSimulator />} 
            />
            {/* Other routes would be added here */}
          </Routes>
        </div>
      </div>
      <Footer />
    </Router>
  );
}

// Sidebar Component
function Sidebar({ simulators }) {
  return (
    <div className="sidebar">
      <div className="logo">Mass Transfer Simulator</div>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li className="nav-header">Simulators</li>
          {simulators.map(sim => (
            <li key={sim.id}>
              <Link to={sim.path}>{sim.title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <img src="/IITK_logo.png" alt="IITK's Logo" height="40" />
        </div>
        <div className="footer-text">
          <p>Shantanu</p>
          <p>CHE213 - Mass Transfer</p>
        </div>
      </div>
    </footer>
  );
}

export default App;