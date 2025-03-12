import React from 'react';
import { Link } from 'react-router-dom';
import './SimulatorIntro.css';

const SimulatorIntro = ({ simulator, simulatorPath }) => {
  const getDetailedDescription = (id) => {
    // Different detailed descriptions based on simulator type
    if (id === 'equimolar-diffusion') {
      return (
        <>
          <p>
            Equimolar Counter Diffusion is a mass transfer process where two species diffuse
            in opposite directions with equal molar flux, following Fick's Law.
          </p>
          <p>
            In this simulation, you can observe the concentration profiles as two species
            diffuse through different geometries (planar, cylindrical, or spherical).
          </p>
          <p>
            <strong>Key Parameters:</strong>
          </p>
          <ul>
            <li><strong>Diffusivity (D<sub>AB</sub>):</strong> The diffusion coefficient between species A and B</li>
            <li><strong>Concentration Gradient:</strong> The driving force for diffusion</li>
            <li><strong>System Length:</strong> The characteristic dimension of the system</li>
            <li><strong>Geometry:</strong> The shape of the diffusion medium (planar, cylindrical, or spherical)</li>
          </ul>
          <p>
            <strong>Governing Equation:</strong> Fick's First Law
          </p>
          <div className="equation">
            J<sub>A</sub> = -D<sub>AB</sub> · dC<sub>A</sub>/dx
          </div>
          <p>
            The simulation visualizes how concentration profiles evolve in different geometries
            and how they are affected by changes in diffusivity and system dimensions.
          </p>
        </>
      );
    }
    // Add cases for other simulators here
    return <p>Information about this simulator will be added soon.</p>;
  };

  return (
    <div className="simulator-intro">
      <h1>{simulator.title}</h1>
      <div className="intro-content">
        {getDetailedDescription(simulator.id)}
        <div className="start-simulation">
          <Link to={simulatorPath} className="simulation-button">
            Open Simulator
          </Link>
        </div>
      </div>
    </div>
  );
};

export default  SimulatorIntro;