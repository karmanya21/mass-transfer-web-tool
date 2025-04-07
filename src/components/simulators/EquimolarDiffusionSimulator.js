import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './EquimolarDiffusionSimulator.css';

const EquimolarDiffusionSimulator = () => {
  // State for simulation parameters
  const [diffusivity, setDiffusivity] = useState(1.6e-5); // m²/s (default: air-CO₂)
  const [concentrationA0, setConcentrationA0] = useState(1.0); // mol/L
  const [concentrationAL, setConcentrationAL] = useState(0.1); // mol/L
  const [systemLength, setSystemLength] = useState(0.01); // m (1 cm)
  const [geometry, setGeometry] = useState('planar'); // planar, cylindrical, spherical
  
  // Reference for D3 visualization
  const visualizationRef = useRef();
  
  // Calculate concentration profile based on current parameters
  const calculateConcentrationProfile = () => {
    const points = 100; // number of points in the profile
    const profile = [];
    
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * systemLength;
      let concentration;
      
      // Different equations based on geometry
      if (geometry === 'planar') {
        // Linear profile for steady-state planar diffusion
        concentration = concentrationA0 - (x / systemLength) * (concentrationA0 - concentrationAL);
      } else if (geometry === 'cylindrical') {
        // Logarithmic profile for cylindrical diffusion
        const r = x;
        const R = systemLength;
        // Prevent division by zero or log(0)
        if (r < 0.0001) {
          concentration = concentrationA0;
        } else {
          // Correct formula for cylindrical geometry
          concentration = concentrationA0 - (concentrationA0 - concentrationAL) * (Math.log(r/0.0001) / Math.log(R/0.0001));
        }
      } 
      // else { // spherical
      //   // 1/r profile for spherical diffusion
      //   const r = x + 0.001; // Add small offset to avoid division by zero
      //   const R = systemLength ;
  
      //   concentration = concentrationAL + (concentrationA0 - concentrationAL) * (1 - r/R);
      // }
      
      profile.push({
        position: x,
        concentration: concentration
      });
    }
    
    return profile;
  };
  
  // Calculate flux at each position
  const calculateFlux = () => {
    const profile = calculateConcentrationProfile();
    const flux = [];
    
    for (let i = 0; i < profile.length - 1; i++) {
      const dC = profile[i + 1].concentration - profile[i].concentration;
      const dx = profile[i + 1].position - profile[i].position;
      const position = profile[i].position;
      
      // Fick's law: J = -D * (dC/dx)
      flux.push({
        position: position,
        flux: -diffusivity * (dC / dx)
      });
    }
    
    return flux;
  };
  
  // Update visualization when parameters change
  useEffect(() => {
    if (!visualizationRef.current) return;
    
    const profile = calculateConcentrationProfile();
    const flux = calculateFlux();
    
    updateVisualization(profile, flux);
  }, [diffusivity, concentrationA0, concentrationAL, systemLength, geometry]);
  
  // D3 visualization function
  const updateVisualization = (profile, flux) => {
    const svg = d3.select(visualizationRef.current);
    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 90 };
    
    // Clear previous visualization
    svg.selectAll("*").remove();
    
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, systemLength])
      .range([margin.left, width - margin.right]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(profile, d => d.concentration) * 1.1])
      .range([height - margin.bottom, margin.top]);
    
    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d => `${(d * 100).toFixed(1)} cm`);
    
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis);
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${d.toFixed(2)} mol/L`);
    
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);
    
    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .text("Position");
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15 )
      .text("Concentration (mol/L)");
    
    // Add title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("font-weight", "bold")
      .text(`Concentration Profile (${geometry} geometry)`);
    
    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.position))
      .y(d => yScale(d.concentration))
      .curve(d3.curveMonotoneX);
    
    // Add concentration profile line
    svg.append("path")
      .datum(profile)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add points for species A and B
    svg.selectAll(".point-a")
      .data(profile.filter((d, i) => i % 10 === 0))
      .enter()
      .append("circle")
      .attr("class", "point-a")
      .attr("cx", d => xScale(d.position))
      .attr("cy", d => yScale(d.concentration))
      .attr("r", 4)
      .attr("fill", "blue");
    
    svg.selectAll(".point-b")
      .data(profile.filter((d, i) => i % 10 === 0))
      .enter()
      .append("circle")
      .attr("class", "point-b")
      .attr("cx", d => xScale(d.position))
      .attr("cy", d => yScale(concentrationA0 + concentrationAL - d.concentration))
      .attr("r", 4)
      .attr("fill", "red");
    
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
      .text("Species A");
    
    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 20)
      .attr("r", 4)
      .attr("fill", "red");
    
    legend.append("text")
      .attr("x", 10)
      .attr("y", 24)
      .text("Species B");
      
    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");
    }

    // Add a transparent overlay for mouse tracking
    const overlay = svg.append("rect")
      .attr("class", "overlay")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .style("fill", "none")
      .style("pointer-events", "all");

    // Add mousemove event to show tooltip
    overlay.on("mousemove", function(event) {
      const [mouseX, mouseY] = d3.pointer(event);
      
      // Convert mouse position to data values
      const xValue = xScale.invert(mouseX);
      const yValue = yScale.invert(mouseY);
      
      // Show tooltip with the values
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      tooltip.html(`Position: ${(xValue * 100).toFixed(2)} cm<br/>Concentration: ${yValue.toFixed(3)} mol/L`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  };
  
  // Format number with correct scientific notation
  const formatScientific = (value) => {
    if (value === 0) return "0";
    
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    
    if (exponent < -3 || exponent > 3) {
      const mantissa = value / Math.pow(10, exponent);
      return `${mantissa.toFixed(2)}×10^${exponent}`;
    }
    
    return value.toPrecision(4);
  };
  
  return (
    <div className="simulator-container">
      <h1>Equimolar Counter Diffusion Simulator</h1>
      
      <div className="simulation-layout">
        <div className="controls-panel">
          <h3>Simulation Parameters</h3>
          
          <div className="parameter">
            <label>Diffusivity (D<sub>AB</sub>):</label>
            <input 
              type="range" 
              min={1e-10} 
              max={1e-3} 
              step={1e-10} 
              value={diffusivity}
              onChange={(e) => setDiffusivity(parseFloat(e.target.value))}
            />
            <span className="value">{formatScientific(diffusivity)} m²/s</span>
          </div>
          
          <div className="parameter">
            <label>Concentration at x=0:</label>
            <input 
              type="range" 
              min={0.01} 
              max={2} 
              step={0.01} 
              value={concentrationA0}
              onChange={(e) => setConcentrationA0(parseFloat(e.target.value))}
            />
            <span className="value">{concentrationA0.toFixed(2)} mol/L</span>
          </div>
          
          <div className="parameter">
            <label>Concentration at x=L:</label>
            <input 
              type="range" 
              min={0.01} 
              max={2} 
              step={0.01} 
              value={concentrationAL}
              onChange={(e) => setConcentrationAL(parseFloat(e.target.value))}
            />
            <span className="value">{concentrationAL.toFixed(2)} mol/L</span>
          </div>
          
          <div className="parameter">
            <label>System Length:</label>
            <input 
              type="range" 
              min={0.001} 
              max={0.1} 
              step={0.001} 
              value={systemLength}
              onChange={(e) => setSystemLength(parseFloat(e.target.value))}
            />
            <span className="value">{(systemLength * 100).toFixed(1)} cm</span>
          </div>
          
          <div className="parameter">
            <label>Geometry:</label>
            <div className="custom-dropdown">
              <select 
                value={geometry}
                onChange={(e) => setGeometry(e.target.value)}
              >
                <option value="planar">Planar</option>
                <option value="cylindrical">Cylindrical</option>
                {/* <option value="spherical">Spherical</option> */}
              </select>
              <div className="geometry-icon">
                {geometry === 'planar' && <div className="icon-planar"></div>}
                {geometry === 'cylindrical' && <div className="icon-cylindrical"></div>}
              </div>
            </div>
          </div>
          
          <div className="calculated-values">
            <h4>Calculated Values:</h4>
            <div className="result-card">
              <div className="result-icon flux-icon"></div>
              <div className="result-content">
                <div className="result-label">Flux at x=0:</div>
                <div className="result-value">{formatScientific(Math.abs(diffusivity * (concentrationA0 - concentrationAL) / systemLength))} mol/m²·s</div>
              </div>
            </div>
            
            <div className="result-card">
              <div className="result-icon concentration-icon"></div>
              <div className="result-content">
                <div className="result-label">Average Concentration:</div>
                <div className="result-value">{((concentrationA0 + concentrationAL) / 2).toFixed(2)} mol/L</div>
              </div>
            </div>
          </div>


        </div>
        
        <div className="visualization-panel">
          <svg ref={visualizationRef} width="600" height="400"></svg>
          
          <div className="visualization-description">
            <p>
              The plot shows the concentration profiles of species A (blue) and B (red) across the system length.
              In equimolar counter diffusion, the molar fluxes of A and B are equal in magnitude but opposite in direction.
            </p>
            <p>
              For planar geometry, the concentration profile is linear while for cylindrical geometry {/*and spherical geometries,*/}
              the profiles follow logarithmic {/*and inverse-r */}relationship. {/*, respectively. */}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquimolarDiffusionSimulator;