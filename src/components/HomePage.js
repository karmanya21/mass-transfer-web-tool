import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <h1>Mass Transfer Phenomena Simulator</h1>
      <div className="intro-content">
        <p>
          Welcome to the Mass Transfer Phenomena Simulator, a visualization tool designed to help
          understand fundamental mass transfer concepts in chemical engineering.
        </p>
        <p>
          Mass transfer is the net movement of mass from one location to another driven by a concentration
          gradient. It plays a crucial role in many chemical engineering processes including distillation,
          absorption, extraction, and membrane separation.
        </p>
        <p>
          This simulator provides interactive visualizations for eight key mass transfer phenomena,
          allowing users to adjust parameters and observe real-time effects on concentration profiles,
          fluxes, and other relevant variables.
        </p>
        <div className="get-started">
          <p>Select a simulation from the sidebar to begin exploring mass transfer concepts.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;