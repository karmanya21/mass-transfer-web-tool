import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PackedBedAbsorptionSimulator = () => {
  // State for simulation parameters
  const [bedLength, setBedLength] = useState(1.0); // m
  const [bedDiameter, setBedDiameter] = useState(0.1); // m
  const [particleDiameter, setParticleDiameter] = useState(0.005); // m
  const [voidFraction, setVoidFraction] = useState(0.4); // dimensionless
  const [inletConcentration, setInletConcentration] = useState(1.0); // mol/L
  const [flowRate, setFlowRate] = useState(0.001); // m³/s
  const [diffusivity, setDiffusivity] = useState(1.6e-5); // m²/s
  const [massTransferCoefficient, setMassTransferCoefficient] = useState(0.1); // m/s
  const [adsorptionCapacity, setAdsorptionCapacity] = useState(10.0); // mol/kg
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'breakthrough'
  
  // References for D3 visualizations
  const profileVisualizationRef = useRef(null);
  const breakthroughVisualizationRef = useRef(null);
  
  // Calculate concentration profile based on current parameters
  const calculateConcentrationProfile = () => {
    const points = 100; // number of points in the profile
    const profile = [];
    
    // Calculate superficial velocity
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    const superficialVelocity = flowRate / crossSectionalArea;
    
    // Calculate mass transfer zone length (simplified)
    const massTransferZoneLength = superficialVelocity / massTransferCoefficient;
    
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * bedLength;
      
      // Analytical solution for absorption column (simplified exponential decay)
      const normalizedX = x / bedLength;
      
      // Assume MTZ (mass transfer zone) starts at 20% of bed length for visualization
      const mtzStart = 0.2;
      
      let concentration;
      if (normalizedX < mtzStart) {
        // Before MTZ, concentration is at inlet level
        concentration = inletConcentration;
      } else if (normalizedX > mtzStart + (massTransferZoneLength / bedLength)) {
        // After MTZ, concentration is near zero (absorbed)
        concentration = 0.05 * inletConcentration;
      } else {
        // Within MTZ, concentration decreases exponentially
        const mtzPosition = (normalizedX - mtzStart) / (massTransferZoneLength / bedLength);
        concentration = inletConcentration * Math.exp(-5 * mtzPosition);
      }
      
      profile.push({
        position: x,
        concentration: concentration
      });
    }
    
    return profile;
  };
  
  // Calculate breakthrough curve
  const calculateBreakthroughCurve = () => {
    const points = 100;
    const curve = [];
    
    // Calculate superficial velocity
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    const superficialVelocity = flowRate / crossSectionalArea;
    
    // Calculate bed volume and mass
    const bedVolume = crossSectionalArea * bedLength;
    const particleDensity = 2500; // kg/m³ (typical for adsorbents)
    const bedMass = bedVolume * (1 - voidFraction) * particleDensity;
    
    // Calculate total adsorption capacity
    const totalCapacity = bedMass * adsorptionCapacity; // mol
    
    // Calculate loading rate
    const loadingRate = flowRate * inletConcentration; // mol/s
    
    // Calculate theoretical breakthrough time (simplified)
    const theoreticalBreakthroughTime = totalCapacity / loadingRate;
    
    // Add mass transfer resistance effect (MTZ)
    const mtzFactor = 0.2; // MTZ takes up about 20% of total time
    const breakthroughTime = theoreticalBreakthroughTime * (1 - mtzFactor);
    const saturationTime = theoreticalBreakthroughTime * (1 + mtzFactor);
    
    // Generate breakthrough curve points
    for (let i = 0; i <= points; i++) {
      const time = (i / points) * (saturationTime * 1.2); // extend a bit past saturation
      
      // S-shaped breakthrough curve using logistic function
      let concentration;
      if (time < breakthroughTime * 0.8) {
        // Before breakthrough
        concentration = 0.01 * inletConcentration;
      } else if (time > saturationTime) {
        // After saturation
        concentration = 0.99 * inletConcentration;
      } else {
        // Breakthrough curve
        const normalizedTime = (time - breakthroughTime * 0.8) / (saturationTime - breakthroughTime * 0.8);
        concentration = inletConcentration / (1 + Math.exp(-10 * (normalizedTime - 0.5)));
      }
      
      curve.push({
        time: time,
        concentration: concentration
      });
    }
    
    return curve;
  };
  
  // Create concentration profile visualization
  const createProfileVisualization = (profile) => {
    if (!profileVisualizationRef.current) return;
    
    try {
      // Get the SVG element
      const svg = d3.select(profileVisualizationRef.current);
      
      // Clear previous visualization
      svg.selectAll("*").remove();
      
      // Set dimensions
      const width = profileVisualizationRef.current.clientWidth || 600;
      const height = profileVisualizationRef.current.clientHeight || 400;
      const margin = { top: 40, right: 40, bottom: 60, left: 90 };
      
      // Create scales
      const xScale = d3.scaleLinear()
        .domain([0, bedLength])
        .range([margin.left, width - margin.right]);
      
      const yScale = d3.scaleLinear()
        .domain([0, inletConcentration * 1.1])
        .range([height - margin.bottom, margin.top]);
      
      // Add X axis
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat(d => `${(d * 100).toFixed(1)} cm`));
      
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
        .text("Position in Bed");
      
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
        .text("Concentration Profile in Packed Bed Absorber");
      
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
      console.error("Error creating profile visualization:", error);
    }
  };
  
  // Create breakthrough curve visualization
  const createBreakthroughVisualization = (breakthrough) => {
    if (!breakthroughVisualizationRef.current) return;
    
    try {
      // Get the SVG element
      const svg = d3.select(breakthroughVisualizationRef.current);
      
      // Clear previous visualization
      svg.selectAll("*").remove();
      
      // Set dimensions
      const width = breakthroughVisualizationRef.current.clientWidth || 600;
      const height = breakthroughVisualizationRef.current.clientHeight || 400;
      const margin = { top: 40, right: 40, bottom: 60, left: 90 };
      
      // Create scales
      const xScale = d3.scaleLinear()
        .domain([0, d3.max(breakthrough, d => d.time)])
        .range([margin.left, width - margin.right]);
      
      const yScale = d3.scaleLinear()
        .domain([0, inletConcentration * 1.1])
        .range([height - margin.bottom, margin.top]);
      
      // Add X axis
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat(d => `${d.toFixed(1)} s`));
      
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
        .text("Outlet Concentration (mol/L)");
      
      // Add title
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("font-weight", "bold")
        .text("Breakthrough Curve");
      
      // Create line generator
      const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.concentration))
        .curve(d3.curveMonotoneX);
      
      // Add the line
      svg.append("path")
        .datum(breakthrough)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);
      
      // Add points
      svg.selectAll(".breakthrough-point")
        .data(breakthrough.filter((d, i) => i % 10 === 0))
        .enter()
        .append("circle")
        .attr("class", "breakthrough-point")
        .attr("cx", d => xScale(d.time))
        .attr("cy", d => yScale(d.concentration))
        .attr("r", 4)
        .attr("fill", "blue");
      
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
      console.error("Error creating breakthrough visualization:", error);
    }
  };
  
  // Update visualizations when parameters change or tab changes
  useEffect(() => {
    const updateVisualization = () => {
      // Only render the active tab visualization
      if (activeTab === 'profile') {
        const profile = calculateConcentrationProfile();
        createProfileVisualization(profile);
      } else {
        const breakthrough = calculateBreakthroughCurve();
        createBreakthroughVisualization(breakthrough);
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
  }, [
    bedLength, 
    bedDiameter, 
    particleDiameter, 
    voidFraction, 
    inletConcentration, 
    flowRate, 
    diffusivity, 
    massTransferCoefficient,
    adsorptionCapacity,
    activeTab
  ]);
  
  // Format scientific notation for display
  const formatScientific = (value) => {
    return value.toExponential(2);
  };
  
  // Calculate derived values
  const calculateSuperficialVelocity = () => {
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    return flowRate / crossSectionalArea;
  };
  
  const calculateMassTransferZone = () => {
    const superficialVelocity = calculateSuperficialVelocity();
    return superficialVelocity / massTransferCoefficient;
  };
  
  const calculateBreakthroughTime = () => {
    // Calculate bed volume and mass
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    const bedVolume = crossSectionalArea * bedLength;
    const particleDensity = 2500; // kg/m³ (typical for adsorbents)
    const bedMass = bedVolume * (1 - voidFraction) * particleDensity;
    
    // Calculate total adsorption capacity
    const totalCapacity = bedMass * adsorptionCapacity; // mol
    
    // Calculate loading rate
    const loadingRate = flowRate * inletConcentration; // mol/s
    
    // Calculate theoretical breakthrough time
    return totalCapacity / loadingRate;
  };
  
  return (
    <div className="simulator-container">
      <h1>Packed Bed Absorption Column Simulator</h1>
      
      <div className="simulation-layout">
        <div className="controls-panel">
          <h3>Simulation Parameters</h3>
          
          <div className="parameter">
            <label htmlFor="bedLength">Bed Length (m)</label>
            <input
              type="range"
              id="bedLength"
              min="0.1"
              max="5"
              step="0.1"
              value={bedLength}
              onChange={(e) => setBedLength(parseFloat(e.target.value))}
            />
            <span className="value">{bedLength.toFixed(1)} m</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="bedDiameter">Bed Diameter (m)</label>
            <input
              type="range"
              id="bedDiameter"
              min="0.01"
              max="0.5"
              step="0.01"
              value={bedDiameter}
              onChange={(e) => setBedDiameter(parseFloat(e.target.value))}
            />
            <span className="value">{bedDiameter.toFixed(2)} m</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="particleDiameter">Particle Diameter (m)</label>
            <input
              type="range"
              id="particleDiameter"
              min="0.001"
              max="0.02"
              step="0.001"
              value={particleDiameter}
              onChange={(e) => setParticleDiameter(parseFloat(e.target.value))}
            />
            <span className="value">{particleDiameter.toFixed(3)} m</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="voidFraction">Void Fraction</label>
            <input
              type="range"
              id="voidFraction"
              min="0.3"
              max="0.7"
              step="0.05"
              value={voidFraction}
              onChange={(e) => setVoidFraction(parseFloat(e.target.value))}
            />
            <span className="value">{voidFraction.toFixed(2)}</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="inletConcentration">Inlet Concentration (mol/L)</label>
            <input
              type="range"
              id="inletConcentration"
              min="0.1"
              max="5"
              step="0.1"
              value={inletConcentration}
              onChange={(e) => setInletConcentration(parseFloat(e.target.value))}
            />
            <span className="value">{inletConcentration.toFixed(1)} mol/L</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="flowRate">Flow Rate (m³/s)</label>
            <input
              type="range"
              id="flowRate"
              min="0.0001"
              max="0.01"
              step="0.0001"
              value={flowRate}
              onChange={(e) => setFlowRate(parseFloat(e.target.value))}
            />
            <span className="value">{formatScientific(flowRate)} m³/s</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="diffusivity">Diffusivity (m²/s)</label>
            <input
              type="range"
              id="diffusivity"
              min="1e-6"
              max="1e-4"
              step="1e-6"
              value={diffusivity}
              onChange={(e) => setDiffusivity(parseFloat(e.target.value))}
            />
            <span className="value">{formatScientific(diffusivity)} m²/s</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="massTransferCoefficient">Mass Transfer Coefficient (m/s)</label>
            <input
              type="range"
              id="massTransferCoefficient"
              min="0.01"
              max="1"
              step="0.01"
              value={massTransferCoefficient}
              onChange={(e) => setMassTransferCoefficient(parseFloat(e.target.value))}
            />
            <span className="value">{massTransferCoefficient.toFixed(2)} m/s</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="adsorptionCapacity">Adsorption Capacity (mol/kg)</label>
            <input
              type="range"
              id="adsorptionCapacity"
              min="1"
              max="50"
              step="1"
              value={adsorptionCapacity}
              onChange={(e) => setAdsorptionCapacity(parseFloat(e.target.value))}
            />
            <span className="value">{adsorptionCapacity.toFixed(1)} mol/kg</span>
          </div>
          
          <div className="calculated-values">
            <h4>Calculated Values</h4>
            
            <div className="result-card">
              <div className="result-content">
                <div className="result-label">Superficial Velocity</div>
                <div className="result-value">
                  {calculateSuperficialVelocity().toFixed(4)} m/s
                </div>
              </div>
            </div>
            
            <div className="result-card">
              <div className="result-content">
                <div className="result-label">Mass Transfer Zone Length</div>
                <div className="result-value">
                  {calculateMassTransferZone().toFixed(2)} m
                </div>
              </div>
            </div>
            
            <div className="result-card">
              <div className="result-content">
                <div className="result-label">Breakthrough Time</div>
                <div className="result-value">
                  {calculateBreakthroughTime().toFixed(1)} s
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="visualization-panel">
          <div className="visualization-tabs">
            <button 
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Concentration Profile
            </button>
            <button 
              className={`tab-button ${activeTab === 'breakthrough' ? 'active' : ''}`}
              onClick={() => setActiveTab('breakthrough')}
            >
              Breakthrough Curve
            </button>
          </div>
          
          <div className="visualization-container">
            <svg 
              ref={profileVisualizationRef} 
              width="100%" 
              height="400" 
              style={{
                display: activeTab === 'profile' ? 'block' : 'none',
                maxWidth: "100%"
              }}
            ></svg>
            <svg 
              ref={breakthroughVisualizationRef} 
              width="100%" 
              height="400" 
              style={{
                display: activeTab === 'breakthrough' ? 'block' : 'none',
                maxWidth: "100%"
              }}
            ></svg>
          </div>
          
          <div className="visualization-description">
            <p>
              {activeTab === 'profile' 
                ? "This simulation shows the concentration profile along a packed bed absorption column. The concentration decreases as the solute is absorbed by the packing material."
                : "This simulation shows the breakthrough curve, which represents how the concentration at the outlet changes over time as the adsorbent becomes saturated."}
              Adjust the parameters to see how they affect the {activeTab === 'profile' ? 'concentration profile' : 'breakthrough curve'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackedBedAbsorptionSimulator;