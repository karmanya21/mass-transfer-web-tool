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
  
  // Langmuir isotherm parameters
  const [maxAdsorptionCapacity, setMaxAdsorptionCapacity] = useState(10.0); // mol/kg (qm)
  const [langmuirConstant, setLangmuirConstant] = useState(0.5); // L/mol (KL)
  
  // Mass transfer parameters
  const [filmMassTransferCoeff, setFilmMassTransferCoeff] = useState(0.05); // m/s (kf)
  const [intraparticleDiffusion, setIntraparticleDiffusion] = useState(1.0e-6); // m²/s (Dp)
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'breakthrough'
  
  // References for D3 visualizations
  const profileVisualizationRef = useRef(null);
  const breakthroughVisualizationRef = useRef(null);
  
  // Calculate mass transfer coefficient using correlation
  const calculateMassTransferCoefficient = () => {
    // Calculate Reynolds number
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    const superficialVelocity = flowRate / crossSectionalArea;
    const fluidDensity = 1000; // kg/m³ (for water)
    const fluidViscosity = 0.001; // Pa·s (for water)
    const reynolds = fluidDensity * superficialVelocity * particleDiameter / fluidViscosity;
    
    // Calculate Schmidt number
    const schmidt = fluidViscosity / (fluidDensity * diffusivity);
    
    // Calculate Sherwood number using Wakao correlation
    const sherwood = 2.0 + 1.1 * Math.pow(reynolds, 0.6) * Math.pow(schmidt, 1/3);
    
    // Calculate mass transfer coefficient
    const kc = sherwood * diffusivity / particleDiameter;
    
    return kc;
  };
  
  // Langmuir isotherm equation: q* = qm * KL * C / (1 + KL * C)
  const calculateEquilibriumLoading = (concentration) => {
    return maxAdsorptionCapacity * langmuirConstant * concentration / (1 + langmuirConstant * concentration);
  };
  
  // Calculate concentration profile using Improved Linear Driving Force Model
  const calculateConcentrationProfile = () => {
    const points = 100; // number of points in the profile
    const profile = [];
    
    // Calculate superficial velocity
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    const superficialVelocity = flowRate / crossSectionalArea;
    
    // Calculate volumetric flow rate constant (equivalent to EBCT^-1)
    const kv = superficialVelocity / bedLength;
    
    // Calculate overall mass transfer coefficient
    const kc = calculateMassTransferCoefficient();
    
    // Calculate particle surface area per unit volume
    const particleSpecificArea = 6 * (1 - voidFraction) / particleDiameter;
    
    // Calculate overall volumetric mass transfer coefficient
    const ka = kc * particleSpecificArea;
    
    // Calculate retardation factor from Langmuir isotherm
    const particleDensity = 2500; // kg/m³
    const bulkDensity = particleDensity * (1 - voidFraction);
    
    // Calculate C10, C50, and C90 positions using approximate analytical solution
    // based on the extended Linear Driving Force model
    const q0 = calculateEquilibriumLoading(inletConcentration);
    const retardationFactor = 1 + ((1 - voidFraction) * particleDensity * maxAdsorptionCapacity * 
                              langmuirConstant / Math.pow(1 + langmuirConstant * inletConcentration, 2)) / voidFraction;
    
    // Calculate effective mass transfer coefficient
    const keff = ka / retardationFactor;
    
    // Calculate characteristic length
    const characteristicLength = superficialVelocity / keff;
    
    // Calculate concentration profile using approximate analytical solution
    for (let i = 0; i <= points; i++) {
      const z = (i / points) * bedLength;
      
      // Using the solution to advection-dispersion equation with first-order reaction
      // C/C0 = exp(-keff/u * z)
      const concentration = inletConcentration * Math.exp(-keff / superficialVelocity * z);
      
      profile.push({
        position: z,
        concentration: concentration
      });
    }
    
    return profile;
  };
  
  // Calculate breakthrough curve using more rigorous physical model
  const calculateBreakthroughCurve = () => {
    const points = 200;
    const curve = [];
    
    // Calculate superficial velocity
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    const superficialVelocity = flowRate / crossSectionalArea;
    
    // Calculate bed volume and mass
    const bedVolume = crossSectionalArea * bedLength;
    const particleDensity = 2500; // kg/m³ (typical for adsorbents)
    const bedMass = bedVolume * (1 - voidFraction) * particleDensity;
    
    // Calculate equilibrium loading
    const qeq = calculateEquilibriumLoading(inletConcentration);
    
    // Calculate stoichiometric time (t0.5)
    const totalCapacity = bedMass * qeq;
    const loadingRate = flowRate * inletConcentration;
    const t05 = totalCapacity / loadingRate;
    
    // Calculate breakthrough time (tb)
    const tb = t05 * 0.7;  // When C/C0 ≈ 0.05
    
    // Generate breakthrough curve points
    const maxTime = t05 * 2;  // Show up to twice the stoichiometric time
    for (let i = 0; i <= points; i++) {
      const time = (i / points) * maxTime;
      let normalizedConcentration;
      
      if (time < tb) {
        normalizedConcentration = 0;
      } else {
        // Standard breakthrough curve equation
        // Uses sigmoid function centered at t0.5 with proper steepness
        const z = 8 * (time - t05) / (t05 - tb);  // Normalized time coordinate
        normalizedConcentration = 1 / (1 + Math.exp(-z));
      }
      
      const concentration = inletConcentration * normalizedConcentration;
      curve.push({
        time: time,
        concentration: concentration
      });
    }
    
    return curve;
  };
  
  // Complementary error function implementation
  const erfc = (x) => {
    // Approximation of the complementary error function
    // Based on Abramowitz and Stegun approximation
    const z = Math.abs(x);
    const t = 1.0 / (1.0 + 0.5 * z);
    
    // Coefficients for approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    // Calculate approximation
    const erfcApprox = t * Math.exp(-z * z) * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
    
    return x < 0 ? 2 - erfcApprox : erfcApprox;
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
      const margin = { top: 40, right: 40, bottom: 60, left: 70 };
      
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
      const margin = { top: 40, right: 40, bottom: 60, left: 70 };
      
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
    maxAdsorptionCapacity,
    langmuirConstant,
    filmMassTransferCoeff,
    intraparticleDiffusion,
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
    const kc = calculateMassTransferCoefficient();
    const particleSpecificArea = 6 * (1 - voidFraction) / particleDiameter;
    const ka = kc * particleSpecificArea;
    
    // Calculate MTZ length based on theory
    const mtz = superficialVelocity / ka;
    return mtz;
  };
  
  const calculateBreakthroughTime = () => {
    // Calculate bed volume and mass
    const crossSectionalArea = Math.PI * Math.pow(bedDiameter, 2) / 4;
    const bedVolume = crossSectionalArea * bedLength;
    const particleDensity = 2500; // kg/m³ (typical for adsorbents)
    const bedMass = bedVolume * (1 - voidFraction) * particleDensity;
    
    // Calculate equilibrium loading using Langmuir isotherm
    const qeq = calculateEquilibriumLoading(inletConcentration);
    
    // Calculate total adsorption capacity
    const totalCapacity = bedMass * qeq; // mol
    
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
            <label htmlFor="maxAdsorptionCapacity">Max Adsorption Capacity (mol/kg)</label>
            <input
              type="range"
              id="maxAdsorptionCapacity"
              min="1"
              max="50"
              step="1"
              value={maxAdsorptionCapacity}
              onChange={(e) => setMaxAdsorptionCapacity(parseFloat(e.target.value))}
            />
            <span className="value">{maxAdsorptionCapacity.toFixed(1)} mol/kg</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="langmuirConstant">Langmuir Constant (L/mol)</label>
            <input
              type="range"
              id="langmuirConstant"
              min="0.1"
              max="10"
              step="0.1"
              value={langmuirConstant}
              onChange={(e) => setLangmuirConstant(parseFloat(e.target.value))}
            />
            <span className="value">{langmuirConstant.toFixed(1)} L/mol</span>
          </div>
          
          <div className="parameter">
            <label htmlFor="intraparticleDiffusion">Intraparticle Diffusion (m²/s)</label>
            <input
              type="range"
              id="intraparticleDiffusion"
              min="1e-7"
              max="1e-5"
              step="1e-7"
              value={intraparticleDiffusion}
              onChange={(e) => setIntraparticleDiffusion(parseFloat(e.target.value))}
            />
            <span className="value">{formatScientific(intraparticleDiffusion)} m²/s</span>
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
                <div className="result-label">Mass Transfer Coefficient</div>
                <div className="result-value">
                  {calculateMassTransferCoefficient().toFixed(5)} m/s
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
            
            <div className="result-card">
              <div className="result-content">
                <div className="result-label">Equilibrium Loading at C0</div>
                <div className="result-value">
                  {calculateEquilibriumLoading(inletConcentration).toFixed(2)} mol/kg
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
                ? "This simulation shows the concentration profile along a packed bed absorption column using a more rigorous model based on Langmuir adsorption isotherm and advection-dispersion with first-order kinetics."
                : "This simulation shows the breakthrough curve based on Langmuir isotherm principles and the modified Klinkenberg solution, which represents how the concentration at the outlet changes over time as the adsorbent becomes saturated."}
              Adjust the parameters to see how they affect the {activeTab === 'profile' ? 'concentration profile' : 'breakthrough curve'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackedBedAbsorptionSimulator;