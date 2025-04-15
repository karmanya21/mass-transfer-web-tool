import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">Mass Transfer Phenomena Simulator</h1>
        <p className="hero-subtitle">Interactive visualizations for chemical engineering concepts</p>
      </div>

      <div className="intro-content">
        <div className="intro-card">
          <div className="card-icon">
            <span>W</span>
          </div>
          <h2>Welcome</h2>
          <p>
            The Mass Transfer Phenomena Simulator is a cutting-edge visualization tool designed to help
            understand fundamental mass transfer concepts in chemical engineering through interactive simulations.
          </p>
        </div>
        
        <div className="intro-card">
          <div className="card-icon">
            <span>M</span>
          </div>
          <h2>What is Mass Transfer?</h2>
          <p>
            Mass transfer is the net movement of mass from one location to another driven by a concentration
            gradient. It plays a crucial role in many chemical engineering processes including distillation,
            absorption, extraction, and membrane separation.
          </p>
        </div>
        
        <div className="intro-card">
          <div className="card-icon">
            <span>I</span>
          </div>
          <h2>Interactive Learning</h2>
          <p>
            Each simulation allows you to adjust parameters and observe real-time effects on concentration 
            profiles, fluxes, and other relevant variables, making complex concepts easier to understand.
          </p>
        </div>
      </div>

      <div className="simulator-showcase">
        <h2 className="section-title">Available Simulations</h2>
        <div className="simulator-grid">
          <Link to="/simulators/equimolar-diffusion" className="simulator-card">
            <div className="card-header">
              <span className="sim-icon">⟷</span>
              <h3>Equimolar Counter Diffusion</h3>
            </div>
            <p>Visualization of two species diffusing in opposite directions with equal molar flux.</p>
            <div className="card-footer">
              <span className="explore-btn">Explore</span>
            </div>
          </Link>
          
          <Link to="/simulators/stagnant-film" className="simulator-card">
            <div className="card-header">
              <span className="sim-icon">⇝</span>
              <h3>Stagnant Film Diffusion</h3>
            </div>
            <p>Simulation of diffusion through a stationary medium.</p>
            <div className="card-footer">
              <span className="explore-btn">Explore</span>
            </div>
          </Link>
          
          <Link to="/simulators/mccabe-thiele" className="simulator-card">
            <div className="card-header">
              <span className="sim-icon">⟿</span>
              <h3>McCabe-Thiele Method</h3>
            </div>
            <p>Interactive visualization of the McCabe-Thiele method for distillation column design.</p>
            <div className="card-footer">
              <span className="explore-btn">Explore</span>
            </div>
          </Link>
          
          <Link to="/simulators/packed-bed" className="simulator-card">
            <div className="card-header">
              <span className="sim-icon">⧉</span>
              <h3>Packed Bed Reactor</h3>
            </div>
            <p>Simulation of mass transfer and reaction in a packed bed reactor.</p>
            <div className="card-footer">
              <span className="explore-btn">Explore</span>
            </div>
          </Link>
          
          <Link to="/simulators/crosscurrent-stage" className="simulator-card">
            <div className="card-header">
              <span className="sim-icon">⇄</span>
              <h3>Crosscurrent Stage</h3>
            </div>
            <p>Interactive visualization of gas-to-liquid mass transfer in crosscurrent operations.</p>
            <div className="card-footer">
              <span className="explore-btn">Explore</span>
            </div>
          </Link>
          
          <Link to="/simulators/distillation-column" className="simulator-card">
            <div className="card-header">
              <span className="sim-icon">⥮</span>
              <h3>Distillation Column</h3>
            </div>
            <p>Interactive simulation of a distillation column with McCabe-Thiele analysis.</p>
            <div className="card-footer">
              <span className="explore-btn">Explore</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="get-started">
        <h2>Ready to Dive In?</h2>
        <p>Select a simulation from the sidebar or cards above to begin exploring mass transfer concepts.</p>
        <p className="highlight-text">Adjust parameters, observe changes, and deepen your understanding through interactive learning.</p>
      </div>
    </div>
  );
};

export default HomePage;