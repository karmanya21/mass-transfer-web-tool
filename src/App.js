// App.js - Main Application Component
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './components/HomePage';
import SimulatorIntro from './components/SimulatorIntro';
import EquimolarDiffusionSimulator from './components/simulators/EquimolarDiffusionSimulator';
import DistillationColumnSimulator from './components/simulators/DistillationColumnSimulator';
import PackedBedSimulator from './components/simulators/PackedBedSimulator';
import StagnantFilmDiffusion from './components/simulators/StagnantFilmDiffusion';
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
  {
    id: 'distillation-column',
    title: 'Distillation Column Stages',
    description: 'Calculate the number of stages in a distillation column using McCabe-Thiele method.',
    path: '/simulators/distillation-column'
  },
  {
    id: 'packed-bed',
    title: 'Packed Bed Reactor',
    description: 'Simulation of mass transfer and reaction in a packed bed reactor.',
    path: '/simulators/packed-bed'
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
            <Route 
              path="/simulators/stagnant-film" 
              element={<SimulatorIntro 
                simulator={simulators[1]} 
                simulatorPath="/simulators/stagnant-film/simulate"
              />} 
            />
            <Route 
              path="/simulators/stagnant-film/simulate" 
              element={<StagnantFilmDiffusion />} 
            />
            <Route 
              path="/simulators/distillation-column" 
              element={<SimulatorIntro 
                simulator={simulators[2]} 
                simulatorPath="/simulators/distillation-column/simulate"
              />} 
            />
            <Route 
              path="/simulators/distillation-column/simulate" 
              element={<DistillationColumnSimulator />} 
            />
            <Route 
              path="/simulators/packed-bed" 
              element={<SimulatorIntro 
                simulator={simulators[3]} 
                simulatorPath="/simulators/packed-bed/simulate"
              />} 
            />
            <Route 
              path="/simulators/packed-bed/simulate" 
              element={<PackedBedSimulator />} 
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
          <p>CHE213 - Mass Transfer</p>
        </div>
      </div>
    </footer>
  );
}

export default App;