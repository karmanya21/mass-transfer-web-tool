import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './StagnantFilmDiffusion.css';

const StagnantFilmDiffusion = () => {
  // State for simulation parameters
  const [filmThickness, setFilmThickness] = useState(0.001); // m
  const [diffusivity, setDiffusivity] = useState(1.0e-9); // m²/s
  const [bulkConcentration, setBulkConcentration] = useState(1.0); // mol/L
  const [surfaceConcentration, setSurfaceConcentration] = useState(0.0); // mol/L
  const [time, setTime] = useState(100); // s
  const [activeTab, setActiveTab] = useState('qualitative'); // 'qualitative' or 'quantitative'
  
  // References for D3 visualizations
  const qualitativeVisualizationRef = useRef(null);
  const quantitativeVisualizationRef = useRef(null);
  
  // Calculate concentration profile based on current parameters
  const calculateConcentrationProfile = () => {
    const points = 100; // number of points in the profile
    const profile = [];
    
    // Calculate characteristic diffusion time (L²/D)
    const characteristicTime = Math.pow(filmThickness, 2) / diffusivity;
    
    // Calculate dimensionless time (t*D/L²)
    const dimensionlessTime = time / characteristicTime;
    
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * filmThickness;
      
      // Analytical solution for diffusion in a stagnant film
      // C(x,t) = Cs + (Cb - Cs) * (1 - erf(x/(2*sqrt(D*t))))
      // where erf is the error function
      const erf = (z) => {
        // Approximation of error function
        const t = 1.0 / (1.0 + 0.5 * Math.abs(z));
        const tau = t * Math.exp(-z * z - 1.26551223 + 
                                t * (1.00002368 + 
                                     t * (0.37409196 + 
                                          t * (0.09678418 + 
                                               t * (-0.18628806 + 
                                                    t * (0.27886807 + 
                                                         t * (-1.13520398 + 
                                                              t * (1.48851587 + 
                                                                   t * (-0.82215223 + 
                                                                        t * 0.17087277)))))))));
        return z >= 0 ? 1 - tau : tau - 1;
      };
      
      const concentration = surfaceConcentration + 
                           (bulkConcentration - surfaceConcentration) * 
                           (1 - erf(x / (2 * Math.sqrt(diffusivity * time))));
      
      profile.push({
        position: x,
        concentration: concentration
      });
    }
    
    return profile;
  };
  
  // Calculate time evolution of concentration at different positions
  const calculateTimeEvolution = () => {
    const timePoints = 100;
    const positions = [0, 0.25, 0.5, 0.75, 1.0]; // normalized positions (x/L)
    const evolution = [];
    
    // Calculate characteristic diffusion time (L²/D)
    const characteristicTime = Math.pow(filmThickness, 2) / diffusivity;
    
    for (let i = 0; i <= timePoints; i++) {
      const t = (i / timePoints) * time;
      const timePoint = { time: t };
      
      // Calculate concentration at each position
      positions.forEach(pos => {
        const x = pos * filmThickness;
        
        // Analytical solution for diffusion in a stagnant film
        const erf = (z) => {
          // Approximation of error function
          const t = 1.0 / (1.0 + 0.5 * Math.abs(z));
          const tau = t * Math.exp(-z * z - 1.26551223 + 
                                  t * (1.00002368 + 
                                       t * (0.37409196 + 
                                            t * (0.09678418 + 
                                                 t * (-0.18628806 + 
                                                      t * (0.27886807 + 
                                                           t * (-1.13520398 + 
                                                                t * (1.48851587 + 
                                                                     t * (-0.82215223 + 
                                                                          t * 0.17087277)))))))));
          return z >= 0 ? 1 - tau : tau - 1;
        };
        
        const concentration = surfaceConcentration + 
                             (bulkConcentration - surfaceConcentration) * 
                             (1 - erf(x / (2 * Math.sqrt(diffusivity * t))));
        
        timePoint[`pos${pos}`] = concentration;
      });
      
      evolution.push(timePoint);
    }
    
    return evolution;
  };
  
  // Create qualitative visualization (concentration profile)
  const createQualitativeVisualization = (profile) => {
    if (!qualitativeVisualizationRef.current) return;
    
    try {
      // Get the SVG element
      const svg = d3.select(qualitativeVisualizationRef.current);
      
      // Clear previous visualization
      svg.selectAll("*").remove();
      
      // Get container dimensions
      const container = qualitativeVisualizationRef.current.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Set SVG dimensions to match container
      svg
        .attr("width", width)
        .attr("height", height);
      
      const margin = { top: 40, right: 40, bottom: 60, left: 60 };
      
      // Create scales
      const xScale = d3.scaleLinear()
        .domain([0, filmThickness])
        .range([margin.left, width - margin.right]);
      
      const yScale = d3.scaleLinear()
        .domain([0, Math.max(bulkConcentration, surfaceConcentration) * 1.1])
        .range([height - margin.bottom, margin.top]);
      
      // Add X axis
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat(d => `${(d * 1000).toFixed(1)} mm`));
      
      // Add Y axis
      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat(d => `${d.toFixed(2)} mol/L`));
      
      // Add X axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .text("Position in Film");
      
      // Add Y axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .text("Concentration (mol/L)");
      
      // Add title
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("font-weight", "bold")
        .text("Concentration Profile in Stagnant Film");
      
      // Create line generator
      const line = d3.line()
        .x(d => xScale(d.position))
        .y(d => yScale(d.concentration))
        .curve(d3.curveMonotoneX);
      
      // Add the line
      svg.append("path")
        .datum(profile)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);
      
      // Add points
      svg.selectAll(".concentration-point")
        .data(profile.filter((d, i) => i % 10 === 0))
        .enter()
        .append("circle")
        .attr("class", "concentration-point")
        .attr("cx", d => xScale(d.position))
        .attr("cy", d => yScale(d.concentration))
        .attr("r", 4)
        .attr("fill", "blue");
      
      // Add film boundaries
      svg.append("line")
        .attr("x1", xScale(0))
        .attr("y1", margin.top)
        .attr("x2", xScale(0))
        .attr("y2", height - margin.bottom)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      svg.append("line")
        .attr("x1", xScale(filmThickness))
        .attr("y1", margin.top)
        .attr("x2", xScale(filmThickness))
        .attr("y2", height - margin.bottom)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      // Add labels for film boundaries
      svg.append("text")
        .attr("x", xScale(0) - 5)
        .attr("y", margin.top - 5)
        .attr("text-anchor", "end")
        .text("Surface (x=0)");
      
      svg.append("text")
        .attr("x", xScale(filmThickness) + 5)
        .attr("y", margin.top - 5)
        .attr("text-anchor", "start")
        .text("Bulk (x=L)");
      
      // Add legend
      const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right - 100},${margin.top + 10})`);
      
      legend.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", "blue");
      
      legend.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text("Concentration");
      
    } catch (error) {
      console.error("Error creating qualitative visualization:", error);
    }
  };
  
  // Create quantitative visualization (time evolution)
  const createQuantitativeVisualization = (evolution) => {
    if (!quantitativeVisualizationRef.current) return;
    
    try {
      // Get the SVG element
      const svg = d3.select(quantitativeVisualizationRef.current);
      
      // Clear previous visualization
      svg.selectAll("*").remove();
      
      // Get container dimensions
      const container = quantitativeVisualizationRef.current.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Set SVG dimensions to match container
      svg
        .attr("width", width)
        .attr("height", height);
      
      const margin = { top: 40, right: 40, bottom: 60, left: 60 };
      
      // Create scales
      const xScale = d3.scaleLinear()
        .domain([0, time])
        .range([margin.left, width - margin.right]);
      
      const yScale = d3.scaleLinear()
        .domain([0, Math.max(bulkConcentration, surfaceConcentration) * 1.1])
        .range([height - margin.bottom, margin.top]);
      
      // Add X axis
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat(d => `${d.toFixed(0)} s`));
      
      // Add Y axis
      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat(d => `${d.toFixed(2)} mol/L`));
      
      // Add X axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .text("Time (s)");
      
      // Add Y axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .text("Concentration (mol/L)");
      
      // Add title
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("font-weight", "bold")
        .text("Time Evolution of Concentration at Different Positions");
      
      // Define colors for different positions
      const colors = d3.schemeCategory10;
      
      // Create line generators for each position
      const positions = [0, 0.25, 0.5, 0.75, 1.0];
      positions.forEach((pos, i) => {
        const line = d3.line()
          .x(d => xScale(d.time))
          .y(d => yScale(d[`pos${pos}`]))
          .curve(d3.curveMonotoneX);
        
        // Add the line
        svg.append("path")
          .datum(evolution)
          .attr("fill", "none")
          .attr("stroke", colors[i])
          .attr("stroke-width", 2)
          .attr("d", line);
        
        // Add points
        svg.selectAll(`.evolution-point-${pos}`)
          .data(evolution.filter((d, j) => j % 10 === 0))
          .enter()
          .append("circle")
          .attr("class", `evolution-point-${pos}`)
          .attr("cx", d => xScale(d.time))
          .attr("cy", d => yScale(d[`pos${pos}`]))
          .attr("r", 3)
          .attr("fill", colors[i]);
      });
      
      // Add legend
      const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right - 150},${margin.top + 10})`);
      
      positions.forEach((pos, i) => {
        const y = i * 20;
        
        legend.append("circle")
          .attr("cx", 0)
          .attr("cy", y)
          .attr("r", 4)
          .attr("fill", colors[i]);
        
        legend.append("text")
          .attr("x", 10)
          .attr("y", y + 4)
          .text(`x/L = ${pos}`);
      });
      
    } catch (error) {
      console.error("Error creating quantitative visualization:", error);
    }
  };
  
  // Update visualizations when parameters change or tab changes
  useEffect(() => {
    const updateVisualization = () => {
      // Only render the active tab visualization
      if (activeTab === 'qualitative') {
        const profile = calculateConcentrationProfile();
        createQualitativeVisualization(profile);
      } else {
        const evolution = calculateTimeEvolution();
        createQuantitativeVisualization(evolution);
      }
    };
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(updateVisualization);
    
    // Add window resize event listener for responsive visualizations
    const handleResize = () => {
      updateVisualization();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [filmThickness, diffusivity, bulkConcentration, surfaceConcentration, time, activeTab]);
  
  // Format scientific notation for display
  const formatScientific = (value) => {
    return value.toExponential(2);
  };
  
  // Calculate derived values
  const calculateCharacteristicTime = () => {
    return Math.pow(filmThickness, 2) / diffusivity;
  };
  
  const calculateDimensionlessTime = () => {
    const characteristicTime = calculateCharacteristicTime();
    return time / characteristicTime;
  };
  
  return (
    <div className="simulator-container">
      <h1>Stagnant Film Diffusion Simulator</h1>
      
      <div className="simulation-layout">
        <div className="controls-panel">
          <h3>Simulation Parameters</h3>
          
          <div className="parameter">
            <label htmlFor="filmThickness">Film Thickness (m)</label>
            <input
              type="range"
              id="filmThickness"
              min="0.0001"
              max="0.01"
              step="0.0001"
              value={filmThickness}
              onChange={(e) => setFilmThickness(parseFloat(e.target.value))}
            />
            <span className="value">{formatScientific(filmThickness)} m</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="diffusivity">Diffusivity (m²/s)</label>
            <input
              type="range"
              id="diffusivity"
              min="1e-10"
              max="1e-8"
              step="1e-10"
              value={diffusivity}
              onChange={(e) => setDiffusivity(parseFloat(e.target.value))}
            />
            <span className="value">{formatScientific(diffusivity)} m²/s</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="bulkConcentration">Bulk Concentration (mol/L)</label>
            <input
              type="range"
              id="bulkConcentration"
              min="0.1"
              max="5"
              step="0.1"
              value={bulkConcentration}
              onChange={(e) => setBulkConcentration(parseFloat(e.target.value))}
            />
            <span className="value">{bulkConcentration.toFixed(1)} mol/L</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="surfaceConcentration">Surface Concentration (mol/L)</label>
            <input
              type="range"
              id="surfaceConcentration"
              min="0"
              max="1"
              step="0.1"
              value={surfaceConcentration}
              onChange={(e) => setSurfaceConcentration(parseFloat(e.target.value))}
            />
            <span className="value">{surfaceConcentration.toFixed(1)} mol/L</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="time">Time (s)</label>
            <input
              type="range"
              id="time"
              min="1"
              max="1000"
              step="1"
              value={time}
              onChange={(e) => setTime(parseFloat(e.target.value))}
            />
            <span className="value">{time.toFixed(0)} s</span>
          </div>
          
          <div className="calculated-values">
            <h4>Calculated Values</h4>
            
            <div className="result-card">
              <div className="result-content">
                <div className="result-label">Characteristic Diffusion Time</div>
                <div className="result-value">
                  {formatScientific(calculateCharacteristicTime())} s
                </div>
              </div>
            </div>
            
            <div className="result-card">
              <div className="result-content">
                <div className="result-label">Dimensionless Time</div>
                <div className="result-value">
                  {calculateDimensionlessTime().toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="visualization-panel">
          <div className="visualization-tabs">
            <button 
              className={`tab-button ${activeTab === 'qualitative' ? 'active' : ''}`}
              onClick={() => setActiveTab('qualitative')}
            >
              Concentration Profile
            </button>
            <button 
              className={`tab-button ${activeTab === 'quantitative' ? 'active' : ''}`}
              onClick={() => setActiveTab('quantitative')}
            >
              Time Evolution
            </button>
          </div>
          
          <div className="visualization-container">
            <svg 
              ref={qualitativeVisualizationRef}
              style={{
                display: activeTab === 'qualitative' ? 'block' : 'none',
                width: '100%',
                height: '100%'
              }}
            ></svg>
            <svg 
              ref={quantitativeVisualizationRef}
              style={{
                display: activeTab === 'quantitative' ? 'block' : 'none',
                width: '100%',
                height: '100%'
              }}
            ></svg>
          </div>
          
          <div className="visualization-description">
            <p>
              {activeTab === 'qualitative' 
                ? "This simulation shows the concentration profile in a stagnant film. The concentration varies from the surface to the bulk due to diffusion."
                : "This simulation shows how the concentration at different positions in the film changes over time as diffusion occurs."}
              Adjust the parameters to see how they affect the {activeTab === 'qualitative' ? 'concentration profile' : 'time evolution'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StagnantFilmDiffusion; 