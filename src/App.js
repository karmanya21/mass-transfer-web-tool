// App.js - Main Application Component
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './components/HomePage';
import SimulatorIntro from './components/SimulatorIntro';
import EquimolarDiffusionSimulator from './components/simulators/EquimolarDiffusionSimulator';
import McCabeThieleCounterCurrent from './components/simulators/McCabeThieleCounterCurrent';
import PackedBedSimulator from './components/simulators/PackedBedSimulator';
import StagnantFilmDiffusion from './components/simulators/StagnantFilmDiffusion';
import CrosscurrentStageSimulator from './components/simulators/CrosscurrentStageSimulator';
import DistillationColumnSimulator from './components/simulators/DistillationColumnSimulator';
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
    id: 'mccabe-thiele',
    title: 'McCabe-Thiele Method Simulator',
    description: 'Interactive visualization of the McCabe-Thiele method for distillation column design.',
    path: '/simulators/mccabe-thiele'
  },
  {
    id: 'packed-bed',
    title: 'Packed Bed Adsorption Column',
    description: 'Simulation of mass transfer and reaction in a packed bed reactor.',
    path: '/simulators/packed-bed'
  },
  {
    id: 'crosscurrent-stage',
    title: 'Crosscurrent Stage Simulator',
    description: 'Interactive visualization of gas-to-liquid mass transfer in crosscurrent operations. Features include equilibrium curve plotting, operating line calculations, and stage-by-stage analysis. Users can adjust flow rates (Ls, Gs), concentrations (X₀, Y₀), and define custom equilibrium relationships.',
    path: '/simulators/crosscurrent-stage'
  },
  {
    id: 'distillation-column',
    title: 'Distillation Column Simulator',
    description: 'Interactive simulation of a distillation column with McCabe-Thiele analysis for multi-component separation.',
    path: '/simulators/distillation-column'
  }
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
              path="/simulators/mccabe-thiele" 
              element={<SimulatorIntro 
                simulator={simulators[2]} 
                simulatorPath="/simulators/mccabe-thiele/simulate"
              />} 
            />
            <Route 
              path="/simulators/mccabe-thiele/simulate" 
              element={<McCabeThieleCounterCurrent />} 
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
            <Route 
              path="/simulators/crosscurrent-stage" 
              element={<SimulatorIntro 
                simulator={simulators[4]} 
                simulatorPath="/simulators/crosscurrent-stage/simulate"
              />} 
            />
            <Route 
              path="/simulators/crosscurrent-stage/simulate" 
              element={<CrosscurrentStageSimulator />} 
            />
            <Route 
              path="/simulators/distillation-column" 
              element={<SimulatorIntro 
                simulator={simulators[5]} 
                simulatorPath="/simulators/distillation-column/simulate"
              />} 
            />
            <Route 
              path="/simulators/distillation-column/simulate" 
              element={<DistillationColumnSimulator />} 
            />
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
          <p>Department of Chemical Engineering</p>
          <p>Indian Institute of Technology Kanpur</p>
          <p>CHE213 - Mass Transfer</p>
          <p>&copy; 2025</p>
        </div>
      </div>
    </footer>
  );
}

export default App;