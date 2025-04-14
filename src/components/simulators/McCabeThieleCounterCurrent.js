import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './McCabeThieleCounterCurrent.css';

const McCabeThieleCounterCurrent = () => {
  // State variables for simulation parameters
  const [equilibriumFunction, setEquilibriumFunction] = useState("2 * x * x"); // Default equilibrium function
  const [Ls, setLs] = useState(130); // Liquid flow rate
  const [Gs, setGs] = useState(50); // Gas flow rate
  const [xIn, setXIn] = useState(0.39); // Input liquid concentration
  const [yIn, setYIn] = useState(0.36); // Input gas concentration
  const [xOut, setXOut] = useState(0.87); // Output liquid concentration
  const [yOut, setYOut] = useState(0); // Calculated output gas concentration
  const [stages, setStages] = useState(0); // Number of stages
  const [stagePoints, setStagePoints] = useState([]); // Points for stages visualization
  const [showOperatingLine, setShowOperatingLine] = useState(true);
  const [showEquilibriumLine, setShowEquilibriumLine] = useState(true);
  const [showStages, setShowStages] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [error, setError] = useState(""); // For error messages
  const [equilibriumError, setEquilibriumError] = useState(""); // For equilibrium function errors

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

  // Function to evaluate the equilibrium function at a given x value
  const evaluateEquilibrium = (x) => {
    try {
      // Replace 'x' with the actual value in the function string
      let functionToEvaluate = equilibriumFunction.replace(/x/g, x);
      
      // Replace ^ with ** for power operations
      functionToEvaluate = functionToEvaluate.replace(/\^/g, '**');
      
      // Use Function constructor to create a function from the string
      // Add Math to the scope to allow mathematical functions
      const fn = new Function('Math', 'return ' + functionToEvaluate);
      const result = fn(Math);
      
      // Check if the result is a valid number
      if (isNaN(result) || !isFinite(result)) {
        throw new Error("Invalid result");
      }
      
      return result;
    } catch (err) {
      console.error("Error evaluating equilibrium function:", err);
      setEquilibriumError(`Invalid equilibrium function: ${err.message}. Please check your syntax.`);
      return 0;
    }
  };

  // Calculate number of stages and stage points
  useEffect(() => {
    setError("");
    setEquilibriumError("");
    
    if (xOut <= xIn) {
      setError("Output liquid concentration must be greater than input");
      setStages(0);
      setStagePoints([]);
      return;
    }

    // Check if feed point and product point are both above or both below equilibrium curve
    const yInEquilibrium = evaluateEquilibrium(xIn);
    const yOutEquilibrium = evaluateEquilibrium(xOut);
    
    // Determine if we're doing absorption (both points above equilibrium) or stripping (both points below equilibrium)
    const isAbsorption = yIn > yInEquilibrium && yOut > yOutEquilibrium;
    const isStripping = yIn < yInEquilibrium && yOut < yOutEquilibrium;
    
    if (!isAbsorption && !isStripping) {
      setError("Both feed and product points must be either above or below the equilibrium curve");
      setStages(0);
      setStagePoints([]);
      return;
    }

    // Calculate the y-intercept of the operating line
    const operatingLineIntercept = yIn - operatingLineSlope * xIn;
    
    // Calculate stages using McCabe-Thiele method
    let currentX = xIn;
    let currentY = yIn;
    let points = [{ x: currentX, y: currentY, type: "start" }];
    let stageCount = 0;
    
    try {
      // Implement the McCabe-Thiele method
      // Continue until we reach or exceed the output concentration
      while (currentX < xOut) {
        stageCount++;
        
        if (isAbsorption) {
          // Move horizontally to equilibrium curve
          const newY = currentY;
          let newX = currentX;
          
          // Find intersection with equilibrium curve
          // Binary search to find where evaluateEquilibrium(x) = currentY
          let left = currentX;
          let right = Math.min(xOut * 1.5, 1.0); // Upper bound
          
          for (let i = 0; i < 20; i++) { // Maximum iterations
            const mid = (left + right) / 2;
            const eqValue = evaluateEquilibrium(mid);
            
            if (Math.abs(eqValue - currentY) < 0.0001) {
              newX = mid;
              break;
            } else if (eqValue < currentY) {
              left = mid;
            } else {
              right = mid;
            }
          }
          
          // If we can't find a valid intersection
          if (newX === currentX) {
            throw new Error("Cannot find intersection with equilibrium curve");
          }
          
          points.push({ x: newX, y: newY, type: "horizontal" });
          currentX = newX;
          
          // Move vertically to operating line
          const newYOnOperatingLine = operatingLineSlope * currentX + operatingLineIntercept;
          points.push({ x: currentX, y: newYOnOperatingLine, type: "vertical" });
          currentY = newYOnOperatingLine;
        } else { // Stripping
          // Move vertically to equilibrium curve
          const newX = currentX;
          const newY = evaluateEquilibrium(currentX);
          points.push({ x: newX, y: newY, type: "vertical" });
          currentY = newY;
          
          // Move horizontally to operating line
          const newXOnOperatingLine = (currentY - operatingLineIntercept) / operatingLineSlope;
          points.push({ x: newXOnOperatingLine, y: currentY, type: "horizontal" });
          currentX = newXOnOperatingLine;
        }
        
        // Safety check: If we're not making progress or exceeding limits
        if (stageCount > 100 || !isFinite(currentX) || !isFinite(currentY) || currentX < 0 || currentY < 0) {
          throw new Error("Calculation exceeded limits");
        }
      }
      
      setStages(stageCount);
      setStagePoints(points);
    } catch (err) {
      console.error("Error in stage calculation:", err);
      setError(`Stage calculation error: ${err.message}`);
      setStages(0);
      setStagePoints([]);
    }
  }, [xIn, yIn, xOut, yOut, operatingLineSlope, equilibriumFunction]);

  // D3 visualization
  useEffect(() => {
    if (!visualizationRef.current) return;
    
    // Clear previous visualization
    d3.select(visualizationRef.current).selectAll("*").remove();
    
    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = visualizationRef.current.clientWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(visualizationRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Determine maximum x and y values for scaling
    const maxX = Math.max(xIn, xOut, 1);
    
    // Calculate maxY based on the equilibrium function
    let maxY = Math.max(yIn, yOut, 1);
    
    // Check a few points on the equilibrium curve to find the maximum y value
    for (let x = 0; x <= maxX; x += maxX / 10) {
      const y = evaluateEquilibrium(x);
      if (y > maxY) {
        maxY = y;
      }
    }
    
    // Add some padding to the maxY value
    maxY = maxY * 1.2;
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, maxX])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxY])
      .range([height, 0]);
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
    
    svg.append("g")
      .call(d3.axisLeft(yScale));
    
    // Add axis labels
    const axisFontSize = 12;
    
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .style("font-size", `${axisFontSize}px`)
      .text("Liquid Phase Concentration (x)");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .style("font-size", `${axisFontSize}px`)
      .text("Gas Phase Concentration (y)");

    // Add grid lines if showGrid is enabled
    if (showGrid) {
      // X-axis grid lines
      svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
          .tickSize(-height)
          .tickFormat("")
        )
        .attr("stroke", "#999")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "3,3");

      // Y-axis grid lines
      svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat("")
        )
        .attr("stroke", "#999")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "3,3");
    }

    // Draw 45-degree line (only above x-axis)
    const x45Max = Math.min(maxX, 1); // Limit to x=1 to ensure y stays positive
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", height)
      .attr("x2", xScale(x45Max))
      .attr("y2", yScale(x45Max))
      .attr("stroke", "gray")
      .attr("stroke-dasharray", "5,5");

    // Draw equilibrium curve if enabled
    if (showEquilibriumLine) {
      // Generate points for the equilibrium curve
      const equilibriumPoints = [];
      for (let x = 0; x <= maxX; x += maxX / 100) {
        const y = evaluateEquilibrium(x);
        if (y >= 0) { // Only include points where y is non-negative
          equilibriumPoints.push({ x, y });
        }
      }
      
      // Create a line generator
      const lineGenerator = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));
      
      // Draw the equilibrium curve
      svg.append("path")
        .datum(equilibriumPoints)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
    }

    // Draw operating line if enabled
    if (showOperatingLine) {
      // Calculate the y-intercept using the point-slope form: y - y1 = m(x - x1)
      // Rearranging: y = mx - mx1 + y1
      // So b = y1 - mx1
      const operatingLineIntercept = yIn - operatingLineSlope * xIn;
      
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

    // Draw feed and product points
    svg.append("circle")
      .attr("cx", xScale(xIn))
      .attr("cy", yScale(yIn))
      .attr("r", 5)
      .attr("fill", "green");
    
    svg.append("circle")
      .attr("cx", xScale(xOut))
      .attr("cy", yScale(yOut))
      .attr("r", 5)
      .attr("fill", "blue");

    // Draw stages if enabled
    if (showStages && stagePoints.length > 0) {
      // Filter out points where y is negative
      const validPoints = stagePoints.filter(point => point.y >= 0);
      
      // Draw stage steps with different colors for horizontal and vertical lines
      for (let i = 0; i < validPoints.length - 1; i++) {
        const current = validPoints[i];
        const next = validPoints[i + 1];
        
        // Create a line element with the appropriate class
        svg.append("line")
          .attr("class", next.type === "horizontal" ? "stage-line horizontal" : "stage-line vertical")
          .attr("x1", xScale(current.x))
          .attr("y1", yScale(current.y))
          .attr("x2", xScale(next.x))
          .attr("y2", yScale(next.y))
          .attr("stroke", next.type === "horizontal" ? "#ff9800" : "#9c27b0")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", next.type === "horizontal" ? "none" : "3,3");
        
        // Add stage points
        if (next.type === "horizontal" || next.type === "vertical") {
          svg.append("circle")
            .attr("class", "stage-point")
            .attr("cx", xScale(next.x))
            .attr("cy", yScale(next.y))
            .attr("r", 3)
            .attr("fill", "#673ab7");
        }
      }
    }

    // Add legend with responsive positioning and sizing
    const legendWidth = Math.max(100, Math.min(130, width * 0.2));
    const legendHeight = Math.max(60, Math.min(80, height * 0.12));
    const legendX = width - legendWidth - 10;
    const legendY = 10;
    
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Operating line legend
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 15)
      .attr("y2", 0)
      .attr("stroke", "blue")
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 20)
      .attr("y", 4)
      .text("Operating Line")
      .style("font-size", `${Math.max(8, axisFontSize * 0.8)}px`);

    // Equilibrium line legend
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 15)
      .attr("x2", 15)
      .attr("y2", 15)
      .attr("stroke", "red")
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 20)
      .attr("y", 19)
      .text("Equilibrium Line")
      .style("font-size", `${Math.max(8, axisFontSize * 0.8)}px`);

    // 45° line legend
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 30)
      .attr("x2", 15)
      .attr("y2", 30)
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5");

    legend.append("text")
      .attr("x", 20)
      .attr("y", 34)
      .text("45° Line")
      .style("font-size", `${Math.max(8, axisFontSize * 0.8)}px`);

    // Feed point legend
    legend.append("circle")
      .attr("cx", 7.5)
      .attr("cy", 45)
      .attr("r", 4)
      .attr("fill", "green");

    legend.append("text")
      .attr("x", 20)
      .attr("y", 49)
      .text("Feed Point")
      .style("font-size", `${Math.max(8, axisFontSize * 0.8)}px`);

    // Product point legend
    legend.append("circle")
      .attr("cx", 7.5)
      .attr("cy", 65)
      .attr("r", 4)
      .attr("fill", "blue");

    legend.append("text")
      .attr("x", 20)
      .attr("y", 69)
      .text("Product Point")
      .style("font-size", `${Math.max(8, axisFontSize * 0.8)}px`);

  }, [equilibriumFunction, operatingLineSlope, xIn, yIn, xOut, yOut, showOperatingLine, showEquilibriumLine, showStages, showGrid, stages, stagePoints]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Re-render the visualization when the window is resized
      if (visualizationRef.current) {
        // This will trigger the D3 visualization useEffect
        visualizationRef.current.style.width = visualizationRef.current.style.width;
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
            <label>Equilibrium Function (y = f(x)):</label>
            <input 
              type="text" 
              value={equilibriumFunction} 
              onChange={e => setEquilibriumFunction(e.target.value)}
              placeholder="e.g., 2.5 * x, 3 * x^2, 2 * Math.sin(x)"
            />
            <div className="parameter-help">
              Enter a JavaScript expression using 'x' as the variable. Examples: 2.5 * x, 3 * x^2, 2 * Math.sin(x)
            </div>
            {equilibriumError && <div className="error-message">{equilibriumError}</div>}
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
              min="20" 
              max="100" 
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
              max="0.5" 
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
              min="0.01" 
              max="0.5" 
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
            <div className="parameter">
              <label>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={e => setShowGrid(e.target.checked)}
                />
                Show Grid
              </label>
            </div>
          </div>
        </div>
        
        <div className="visualization-panel">
          <div className="visualization-container">
            <div className="visualization-area" ref={visualizationRef}></div>
          </div>
          
          <div className="results">
            <h4>Results</h4>
            {error ? (
              <div className="error-message">{error}</div>
            ) : (
              <>
                <div className="result-card">
                  <div className="result-content">
                    <span className="result-label">Number of Stages:</span>
                    <span className="result-value">{stages}</span>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-content">
                    <span className="result-label">Operating Line Slope (Ls/Gs):</span>
                    <span className="result-value">{operatingLineSlope.toFixed(2)}</span>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-content">
                    <span className="result-label">Output Gas Concentration (yOut):</span>
                    <span className="result-value">{yOut.toFixed(4)}</span>
                  </div>
                </div>
              </>
            )}
            
            <div className="visualization-description">
              <h4>About McCabe-Thiele Diagram</h4>
              <p>
                The McCabe-Thiele diagram is a graphical method for determining the number of theoretical stages 
                required for a given separation in a distillation column or other counter-current mass transfer operation.
              </p>
              <p>
                In this diagram, the x-axis represents the liquid phase concentration and the y-axis represents the gas phase concentration.
                The equilibrium line (red) shows the relationship between liquid and gas concentrations at equilibrium.
                The operating line (blue) represents the mass balance between the liquid and gas phases.
              </p>
              <p>
                The number of stages is determined by stepping between the operating line and the equilibrium line.
                Each step represents one theoretical stage in the separation process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default McCabeThieleCounterCurrent;