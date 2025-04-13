import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './DistillationColumnSimulator2.css';

const DistillationColumnSimulator2 = () => {
  // State variables for simulation parameters
  const [equilibriumSlope, setEquilibriumSlope] = useState(2.5);
  const [Ls, setLs] = useState(170); // Liquid flow rate
  const [Gs, setGs] = useState(70); // Gas flow rate
  const [xIn, setXIn] = useState(0.06); // Input liquid concentration
  const [yIn, setYIn] = useState(0.27); // Input gas concentration
  const [xOut, setXOut] = useState(0.46); // Output liquid concentration
  const [yOut, setYOut] = useState(0); // Calculated output gas concentration
  const [stages, setStages] = useState(0); // Number of stages
  const [stagePoints, setStagePoints] = useState([]); // Points for stages visualization
  const [showOperatingLine, setShowOperatingLine] = useState(true);
  const [showEquilibriumLine, setShowEquilibriumLine] = useState(true);
  const [showStages, setShowStages] = useState(true);
  const [error, setError] = useState(""); // For error messages

  // Reference for D3 visualization
  const visualizationRef = useRef(null);

  // Calculate operating line slope
  const operatingLineSlope = Ls / Gs;

  // Calculate output gas concentration based on mass balance
  useEffect(() => {
    // Mass balance: Ls(xOut-xIn) = Gs(yOut-yIn)
    const calculatedYOut = yIn + (Ls / Gs) * (xOut - xIn);
    setYOut(calculatedYOut);
  }, [Ls, Gs, xIn, yIn, xOut]);

  // Calculate number of stages and stage points
  useEffect(() => {
    setError("");
    
    if (xOut <= xIn) {
      setError("Output liquid concentration must be greater than input");
      setStages(0);
      setStagePoints([]);
      return;
    }

    // Check if feed point lies above equilibrium curve
    const yInEquilibrium = equilibriumSlope * xIn;
    if (yIn <= yInEquilibrium) {
      setError("Feed point must lie above the equilibrium curve");
      setStages(0);
      setStagePoints([]);
      return;
    }

    // Check if product point lies above equilibrium curve
    const yOutEquilibrium = equilibriumSlope * xOut;
    if (yOut <= yOutEquilibrium) {
      setError("Product point must lie above the equilibrium curve");
      setStages(0);
      setStagePoints([]);
      return;
    }

    // Calculate y-intercept of operating line
    const operatingLineIntercept = yOut - operatingLineSlope * xOut;

    // Start at (xIn, yIn) and work upwards
    let currentX = xIn;
    let currentY = yIn;
    let stageCount = 0;
    const points = [];

    // Create points for drawing stages
    while (currentX < xOut) {
      // Current point on operating line
      points.push({ x: currentX, y: currentY, type: "operating" });

      // Move horizontally to equilibrium curve (y = equilibriumSlope * x)
      // Find x where y = currentY on equilibrium curve
      // So x = currentY / equilibriumSlope
      const equilibriumX = currentY / equilibriumSlope;
      points.push({ x: equilibriumX, y: currentY, type: "horizontal" });

      // Now on the equilibrium curve, move vertically to operating line
      currentX = equilibriumX;
      
      // Find y on operating line at this x
      currentY = operatingLineSlope * currentX + operatingLineIntercept;
      points.push({ x: currentX, y: currentY, type: "vertical" });

      stageCount++;
      
      // Check if we've reached or passed the product point
      if (currentX >= xOut) {
        // Add final point if we've passed the product point
        if (currentX > xOut) {
          // Interpolate to exact product point
          const finalY = operatingLineSlope * xOut + operatingLineIntercept;
          points.push({ x: xOut, y: finalY, type: "final" });
        }
        break;
      }
      
      // Break the loop if we're not making progress
      if (points.length > 1000) break; 
    }

    setStages(stageCount);
    setStagePoints(points);
  }, [equilibriumSlope, operatingLineSlope, xIn, yIn, xOut, yOut]);

  // Draw McCabe-Thiele diagram
  useEffect(() => {
    if (!visualizationRef.current) return;

    // Clear previous SVG
    d3.select(visualizationRef.current).selectAll("*").remove();

    // Get container dimensions
    const container = visualizationRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set up dimensions with responsive margins
    const margin = { 
      top: Math.max(30, containerHeight * 0.05), 
      right: Math.max(40, containerWidth * 0.05), 
      bottom: Math.max(50, containerHeight * 0.1), 
      left: Math.max(50, containerWidth * 0.1) 
    };
    
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG with responsive dimensions
    const svg = d3.select(visualizationRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Determine max X and Y values for scaling with better padding
    const maxX = Math.max(1, xOut * 1.5, xIn * 1.5);
    const maxY = Math.max(1, yOut * 1.5, equilibriumSlope * maxX * 1.2);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, maxX])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, maxY])
      .range([height, 0]);

    // Add X and Y axes with responsive font sizes
    const axisFontSize = Math.max(10, Math.min(14, width * 0.02));
    
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", `${axisFontSize}px`);

    svg.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", `${axisFontSize}px`);

    // Add axis labels with responsive font sizes
    const labelFontSize = Math.max(12, Math.min(16, width * 0.025));
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("x (Liquid Phase Concentration)")
      .style("font-size", `${labelFontSize}px`);

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text("y (Vapor Phase Concentration)")
      .style("font-size", `${labelFontSize}px`);

    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat("")
      )
      .attr("stroke-opacity", 0.1);

    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("")
      )
      .attr("stroke-opacity", 0.1);

    // Draw 45-degree line (only above x-axis)
    const x45Max = Math.min(maxX, 1); // Limit to x=1 to ensure y stays positive
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", height)
      .attr("x2", xScale(x45Max))
      .attr("y2", yScale(x45Max))
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "5,5");

    // Draw equilibrium line if enabled (only above x-axis)
    if (showEquilibriumLine) {
      // Find the x value where y becomes negative
      const xEquilibriumMax = maxX;
      
      svg.append("line")
        .attr("x1", 0)
        .attr("y1", height)
        .attr("x2", xScale(xEquilibriumMax))
        .attr("y2", yScale(equilibriumSlope * xEquilibriumMax))
        .attr("stroke", "red")
        .attr("stroke-width", 2);
    }

    // Draw operating line if enabled
    if (showOperatingLine) {
      const operatingLineIntercept = yOut - operatingLineSlope * xOut;
      
      // Calculate where the operating line crosses the x-axis (y = 0)
      // For y = mx + b, when y = 0, x = -b/m
      let xIntercept = 0;
      if (operatingLineSlope !== 0) {
        xIntercept = -operatingLineIntercept / operatingLineSlope;
      }
      
      // Determine the starting point for the line
      // If the line crosses the x-axis at a positive x value, start from there
      // Otherwise, start from x = 0
      const xStart = (xIntercept > 0) ? xIntercept : 0;
      
      // Always plot to the maximum x value
      const xEnd = maxX;
      
      // Draw the operating line
      svg.append("line")
        .attr("x1", xScale(xStart))
        .attr("y1", yScale(operatingLineSlope * xStart + operatingLineIntercept))
        .attr("x2", xScale(xEnd))
        .attr("y2", yScale(operatingLineSlope * xEnd + operatingLineIntercept))
        .attr("stroke", "blue")
        .attr("stroke-width", 2);
    }

    // Draw feed and product points with responsive sizes
    const pointRadius = Math.max(3, Math.min(5, width * 0.01));
    const labelOffset = Math.max(8, Math.min(12, width * 0.02));
    
    // Only draw feed point if yIn is positive
    if (yIn >= 0) {
      svg.append("circle")
        .attr("cx", xScale(xIn))
        .attr("cy", yScale(yIn))
        .attr("r", pointRadius)
        .attr("fill", "green");

      svg.append("text")
        .attr("x", xScale(xIn) + labelOffset)
        .attr("y", yScale(yIn) - labelOffset)
        .text("Feed")
        .style("font-size", `${axisFontSize}px`);
    }

    // Only draw product point if yOut is positive
    if (yOut >= 0) {
      svg.append("circle")
        .attr("cx", xScale(xOut))
        .attr("cy", yScale(yOut))
        .attr("r", pointRadius)
        .attr("fill", "blue");

      svg.append("text")
        .attr("x", xScale(xOut) + labelOffset)
        .attr("y", yScale(yOut) - labelOffset)
        .text("Product")
        .style("font-size", `${axisFontSize}px`);
    }

    // Draw stages if enabled
    if (showStages && stages > 0 && stagePoints.length > 0) {
      // Filter out points where y is negative
      const validPoints = stagePoints.filter(point => point.y >= 0);
      
      // Draw stage steps with different colors for horizontal and vertical lines
      for (let i = 0; i < validPoints.length - 1; i++) {
        const current = validPoints[i];
        const next = validPoints[i + 1];
        
        svg.append("line")
          .attr("x1", xScale(current.x))
          .attr("y1", yScale(current.y))
          .attr("x2", xScale(next.x))
          .attr("y2", yScale(next.y))
          .attr("stroke", next.type === "horizontal" ? "green" : next.type === "vertical" ? "purple" : "blue")
          .attr("stroke-width", 2);
      }
      
      // Add stage numbers at midpoints of vertical lines with better visibility
      let stageNum = 1;
      for (let i = 1; i < validPoints.length - 1; i += 3) {
        if (i + 1 < validPoints.length) {
          const current = validPoints[i];
          const next = validPoints[i + 1];
          
          // Only show stage numbers for the vertical lines
          if (current.type === "vertical" && next.type === "horizontal") {
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;
            
            // Add a white background for better readability
            const bgWidth = Math.max(20, Math.min(30, width * 0.05));
            const bgHeight = Math.max(15, Math.min(25, height * 0.04));
            
            svg.append("rect")
              .attr("x", xScale(midX) - bgWidth/2)
              .attr("y", yScale(midY) - bgHeight/2)
              .attr("width", bgWidth)
              .attr("height", bgHeight)
              .attr("fill", "white")
              .attr("opacity", 0.7);
              
            svg.append("text")
              .attr("x", xScale(midX))
              .attr("y", yScale(midY) + axisFontSize/3)
              .attr("text-anchor", "middle")
              .style("font-size", `${axisFontSize}px`)
              .attr("font-weight", "bold")
              .attr("fill", "green")
              .text(stageNum);
            
            stageNum++;
          }
        }
      }
    }

    // Add legend with responsive positioning and sizing
    const legendWidth = Math.max(120, Math.min(150, width * 0.25));
    const legendHeight = Math.max(80, Math.min(100, height * 0.15));
    const legendX = width - legendWidth - 10;
    const legendY = 10;
    
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Operating line legend
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 20)
      .attr("y2", 0)
      .attr("stroke", "blue")
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 5)
      .text("Operating Line")
      .style("font-size", `${axisFontSize}px`);

    // Equilibrium line legend
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 20)
      .attr("x2", 20)
      .attr("y2", 20)
      .attr("stroke", "red")
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 25)
      .text("Equilibrium Line")
      .style("font-size", `${axisFontSize}px`);

    // Stage lines legend
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 40)
      .attr("x2", 20)
      .attr("y2", 40)
      .attr("stroke", "green")
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 45)
      .text("Stage Lines")
      .style("font-size", `${axisFontSize}px`);

  }, [equilibriumSlope, operatingLineSlope, xIn, yIn, xOut, yOut, showOperatingLine, showEquilibriumLine, showStages, stages, stagePoints]);

  // Add window resize handler to redraw the visualization
  useEffect(() => {
    const handleResize = () => {
      // Force a re-render of the visualization
      if (visualizationRef.current) {
        const event = new Event('resize');
        window.dispatchEvent(event);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="simulator-container">
      <h1>McCabe-Thiele Method Simulator</h1>
      
      <div className="simulation-layout">
        <div className="controls-panel">
          <h3>Simulation Parameters</h3>
          
          <div className="parameter">
            <label>Equilibrium Line Slope:</label>
            <input 
              type="range" 
              min="1.1" 
              max="3" 
              step="0.1" 
              value={equilibriumSlope} 
              onChange={e => setEquilibriumSlope(parseFloat(e.target.value))}
            />
            <span className="value">{equilibriumSlope.toFixed(1)}</span>
          </div>
          
          <div className="parameter">
            <label>Liquid Flow Rate (Ls):</label>
            <input 
              type="range" 
              min="50" 
              max="200" 
              step="10" 
              value={Ls} 
              onChange={e => setLs(parseFloat(e.target.value))}
            />
            <span className="value">{Ls}</span>
          </div>
          
          <div className="parameter">
            <label>Gas Flow Rate (Gs):</label>
            <input 
              type="range" 
              min="50" 
              max="200" 
              step="10" 
              value={Gs} 
              onChange={e => setGs(parseFloat(e.target.value))}
            />
            <span className="value">{Gs}</span>
          </div>
          
          <div className="parameter">
            <label>Input Liquid Concentration (xIn):</label>
            <input 
              type="range" 
              min="0.01" 
              max="0.3" 
              step="0.01" 
              value={xIn} 
              onChange={e => setXIn(parseFloat(e.target.value))}
            />
            <span className="value">{xIn.toFixed(2)}</span>
          </div>
          
          <div className="parameter">
            <label>Input Gas Concentration (yIn):</label>
            <input 
              type="range" 
              min="0" 
              max="0.3" 
              step="0.01" 
              value={yIn} 
              onChange={e => setYIn(parseFloat(e.target.value))}
            />
            <span className="value">{yIn.toFixed(2)}</span>
          </div>
          
          <div className="parameter">
            <label>Output Liquid Concentration (xOut):</label>
            <input 
              type="range" 
              min="0.1" 
              max="0.9" 
              step="0.01" 
              value={xOut} 
              onChange={e => setXOut(parseFloat(e.target.value))}
            />
            <span className="value">{xOut.toFixed(2)}</span>
          </div>
          
          <div className="parameter">
            <label>Output Gas Concentration (yOut):</label>
            <div className="calculated-value">{yOut.toFixed(4)}</div>
          </div>
          
          <div className="display-options">
            <h4>Display Options</h4>
            <div className="parameter">
              <label>
                <input
                  type="checkbox"
                  checked={showOperatingLine}
                  onChange={e => setShowOperatingLine(e.target.checked)}
                />
                Show Operating Line
              </label>
            </div>
            <div className="parameter">
              <label>
                <input
                  type="checkbox"
                  checked={showEquilibriumLine}
                  onChange={e => setShowEquilibriumLine(e.target.checked)}
                />
                Show Equilibrium Line
              </label>
            </div>
            <div className="parameter">
              <label>
                <input
                  type="checkbox"
                  checked={showStages}
                  onChange={e => setShowStages(e.target.checked)}
                />
                Show Stages
              </label>
            </div>
          </div>
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          {stages > 0 && (
            <div className="calculated-values">
              <h4>Results</h4>
              <div className="result-card">
                <div className="result-content">
                  <div className="result-label">Number of Stages Required</div>
                  <div className="result-value">{stages}</div>
                </div>
              </div>
              <div className="result-card">
                <div className="result-content">
                  <div className="result-label">Operating Line Slope</div>
                  <div className="result-value">{operatingLineSlope.toFixed(4)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="visualization-panel">
          <div className="visualization-container">
            <div ref={visualizationRef} className="visualization-area"></div>
          </div>
          
          <div className="visualization-description">
            <p>
              The McCabe-Thiele diagram shows the relationship between liquid and vapor phase concentrations
              in a distillation column. The equilibrium line represents the thermodynamic equilibrium between
              phases, while the operating line shows the material balance relationship.
            </p>
            <p>
              Each stage is represented by a step between the operating and equilibrium lines. The number of
              stages required for the separation is determined by counting these steps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistillationColumnSimulator2; 