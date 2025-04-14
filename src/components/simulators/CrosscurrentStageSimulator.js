import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import './CrosscurrentStageSimulator.css';

const CrosscurrentStageSimulator = () => {
  // State variables for simulation parameters
  const [equilibriumFunction, setEquilibriumFunction] = useState("3.60 * x * x"); // Default quadratic function
  const [equilibriumError, setEquilibriumError] = useState(""); // For equilibrium function errors
  const [Ls, setLs] = useState(600); // Default value from image
  const [Gs, setGs] = useState(275); // Default value from image
  const [X0, setX0] = useState(0.0500); // Default value from image
  const [Y0, setY0] = useState(1.5400); // Default value from image
  const [numberOfStages, setNumberOfStages] = useState(3); // Default value from image
  const [error, setError] = useState(""); // For error messages
  const [stagePoints, setStagePoints] = useState([]); // Store calculated stage points

  // Reference for D3 visualization
  const visualizationRef = useRef(null);

  // Function to evaluate the equilibrium function at a given x value
  const evaluateEquilibrium = (x) => {
    try {
      // Clean up the input function string
      let functionToEvaluate = equilibriumFunction.trim();
      
      // Replace x*x with x**2 for better parsing
      functionToEvaluate = functionToEvaluate.replace(/x\s*\*\s*x/g, 'x**2');
      
      // Replace 'x' with the actual value, but be careful with exponential notation
      functionToEvaluate = functionToEvaluate.replace(/(?<!e)x/g, `(${x})`);
      
      // Replace ^ with ** for power operations
      functionToEvaluate = functionToEvaluate.replace(/\^/g, '**');
      
      // Validate the function string before evaluation
      if (!/^[\d\s+\-*/().e]+$/.test(functionToEvaluate.replace(/Math\.\w+/g, ''))) {
        throw new Error("Function contains invalid characters");
      }
      
      const fn = new Function('Math', `return ${functionToEvaluate}`);
      const result = fn(Math);
      
      if (isNaN(result) || !isFinite(result)) {
        throw new Error("Function returned an invalid result");
      }
      
      setEquilibriumError(""); // Clear any previous errors
      return result;
    } catch (err) {
      console.error("Error evaluating equilibrium function:", err);
      let errorMessage = "Invalid equilibrium function. ";
      
      if (err.message.includes("Unexpected token")) {
        errorMessage += "Check for missing operators or parentheses.";
      } else if (err.message.includes("invalid characters")) {
        errorMessage += "Use only numbers, basic operators (+,-,*,/), and Math functions.";
      } else {
        errorMessage += err.message;
      }
      
      setEquilibriumError(errorMessage);
      return 0;
    }
  };

  // Calculate stages and concentrations using mass balance
  const calculateStages = () => {
    const points = [];
    let currentY = Y0;
    const operatingLineSlope = -Ls/Gs;
    
    // Validate operating point is above equilibrium curve
    const equilibriumY = evaluateEquilibrium(X0);
    if (Y0 <= equilibriumY) {
      setError("Operating point must be above the equilibrium curve");
      return [];
    }
    setError("");
    
    for (let stage = 0; stage < numberOfStages; stage++) {
      // Start point of stage (P point in diagram)
      points.push({
        stageNumber: stage + 1,
        type: 'start',
        x: X0,
        y: currentY,
        label: `P${stage + 1}`
      });

      // Calculate intersection with equilibrium curve using binary search
      let left = 0;
      let right = 1;
      let intersectionX = X0;
      let intersectionY = currentY;

      for (let i = 0; i < 20; i++) {
        const mid = (left + right) / 2;
        const eqY = evaluateEquilibrium(mid);
        const opY = currentY + operatingLineSlope * (mid - X0);
        
        if (Math.abs(eqY - opY) < 0.0001) {
          intersectionX = mid;
          intersectionY = eqY;
          break;
        } else if (eqY < opY) {
          left = mid;
        } else {
          right = mid;
        }
      }

      // Add equilibrium point (Q point)
      points.push({
        stageNumber: stage + 1,
        type: 'equilibrium',
        x: intersectionX,
        y: intersectionY,
        label: `Q${stage + 1}`
      });

      // Update Y for next stage
      currentY = intersectionY;
    }

    // Add final point
    points.push({
      stageNumber: numberOfStages + 1,
      type: 'start',
      x: X0,
      y: currentY,
      label: `P${numberOfStages + 1}`
    });

    return points;
  };

  // Update stage points when parameters change
  useEffect(() => {
    setStagePoints(calculateStages());
  }, [equilibriumFunction, Ls, Gs, X0, Y0, numberOfStages]);

  // Memoize the operating line slope to prevent recalculation on every render
  const operatingLineSlope = useMemo(() => (-Ls/Gs).toFixed(3), [Ls, Gs]);

  // D3 visualization update
  const updateVisualization = () => {
    if (!visualizationRef.current || stagePoints.length === 0) return;

    const svg = d3.select(visualizationRef.current);
    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };

    // Clear previous visualization
    svg.selectAll("*").remove();

    // Set up scales
    const xMax = Math.max(X0 * 1.2, ...stagePoints.map(p => p.x * 1.2));
    const yMax = Math.max(Y0 * 1.2, ...stagePoints.map(p => p.y * 1.2));

    const xScale = d3.scaleLinear()
      .domain([0, xMax])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);

    // Draw axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .text("Liquid Phase Concentration (X)");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -40)
      .attr("fill", "black")
      .text("Gas Phase Concentration (Y)");

    // Draw equilibrium curve
    const equilibriumCurve = d3.line()
      .x(d => xScale(d))
      .y(d => yScale(evaluateEquilibrium(d)));

    const xPoints = d3.range(0, xMax, xMax/100);
    
    svg.append("path")
      .datum(xPoints)
      .attr("class", "equilibrium-line")
      .attr("fill", "none")
      .attr("stroke", "blue")
      .attr("stroke-width", 2)
      .attr("d", equilibriumCurve);

    // Draw stage lines and points
    stagePoints.forEach((point, index) => {
      if (index > 0) {
        const prevPoint = stagePoints[index - 1];
        
        // Draw connecting lines between points
        svg.append("line")
          .attr("x1", xScale(prevPoint.x))
          .attr("y1", yScale(prevPoint.y))
          .attr("x2", xScale(point.x))
          .attr("y2", yScale(point.y))
          .attr("stroke", "green")
          .attr("stroke-width", 1.5);

        // Add vertical dotted reference lines for equilibrium points
        if (point.type === 'equilibrium') {
          svg.append("line")
            .attr("x1", xScale(point.x))
            .attr("y1", yScale(0))
            .attr("x2", xScale(point.x))
            .attr("y2", yScale(point.y))
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4");
        }
      }

      // Draw points
      svg.append("circle")
        .attr("cx", xScale(point.x))
        .attr("cy", yScale(point.y))
        .attr("r", 4)
        .attr("fill", point.type === 'equilibrium' ? "blue" : "red");

      // Add point labels
      if (point.label) {
        svg.append("text")
          .attr("x", xScale(point.x) + 10)
          .attr("y", yScale(point.y) - 10)
          .text(point.label)
          .attr("font-size", "12px")
          .attr("fill", "black");
      }
    });

    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right - 120}, ${margin.top})`);

    const legendItems = [
      { color: "blue", text: "Equilibrium Line" },
      { color: "green", text: "Operating Lines" },
      { color: "red", text: "Stage Points (P)" },
      { color: "blue", text: "Equilibrium Points (Q)" }
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", item.color);

      legendRow.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text(item.text)
        .style("font-size", "12px");
    });
  };

  // Update visualization when stage points change
  useEffect(() => {
    updateVisualization();
  }, [stagePoints]);

  return (
    <div className="simulator-container">
      <h1>Crosscurrent Stage Simulator</h1>
      
      <div className="simulation-layout">
        <div className="controls-panel">
          <h3>Simulation Parameters</h3>
          
          <div className="parameter">
            <label>Equilibrium Function y = f(x):</label>
            <input 
              type="text"
              value={equilibriumFunction}
              onChange={(e) => setEquilibriumFunction(e.target.value)}
              placeholder="e.g., 3.60 * x * x"
              style={{ width: '200px', marginRight: '10px' }}
            />
            {equilibriumError && <div className="error-message">{equilibriumError}</div>}
            <div className="help-text">
              <small>
                Enter the equilibrium function as a JavaScript expression using 'x' as the variable.<br/>
                Examples: "3.60 * x", "2 * x^2 + x", "Math.exp(x)".
              </small>
            </div>
          </div>

          <div className="parameter">
            <label>Liquid Flow Rate (Ls):</label>
            <input 
              type="range" 
              min="100" 
              max="1000" 
              step="50" 
              value={Ls}
              onChange={(e) => setLs(parseFloat(e.target.value))}
            />
            <span>{Ls}</span>
          </div>

          <div className="parameter">
            <label>Gas Flow Rate (Gs):</label>
            <input 
              type="range" 
              min="50" 
              max="500" 
              step="25" 
              value={Gs}
              onChange={(e) => setGs(parseFloat(e.target.value))}
            />
            <span>{Gs}</span>
          </div>

          <div className="parameter">
            <label>X₀:</label>
            <input 
              type="range" 
              min="0.01" 
              max="0.5" 
              step="0.01" 
              value={X0}
              onChange={(e) => setX0(parseFloat(e.target.value))}
            />
            <span>{X0.toFixed(4)}</span>
          </div>

          <div className="parameter">
            <label>Y₀:</label>
            <input 
              type="range" 
              min="0" 
              max="5.0" 
              step="0.01" 
              value={Y0}
              onChange={(e) => setY0(parseFloat(e.target.value))}
            />
            <span>{Y0.toFixed(4)}</span>
          </div>

          <div className="parameter">
            <label>Number of Stages:</label>
            <input 
              type="range" 
              min="1" 
              max="15" 
              step="1" 
              value={numberOfStages}
              onChange={(e) => setNumberOfStages(parseInt(e.target.value))}
            />
            <span>{numberOfStages}</span>
          </div>
        </div>
        
        <div className="main-content">
          <div className="visualization-panel">
            <svg ref={visualizationRef} width="600" height="400"></svg>
            <div className="visualization-description">
              <p>
                This simulator shows an ideal gas-to-liquid crosscurrent mass transfer process with multiple stages. The blue line represents the equilibrium relationship Y = f(X), while green lines show the operating lines for each stage. Points P represent stage conditions, and points Q represent equilibrium conditions. The operating point (Y₀, X₀) must be above the equilibrium curve for valid gas-to-liquid mass transfer.
              </p>
            </div>
          </div>

          <div className="results-panel">
            <h4>Results:</h4>
            <p>Operating Line Slope: {operatingLineSlope}</p>
            {error && <div className="error-message">{error}</div>}
            {stagePoints.filter(p => p.type === 'equilibrium').map((point, idx) => (
              <p key={idx}>Stage {idx + 1}: X = {point.x.toFixed(4)}, Y = {point.y.toFixed(4)}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrosscurrentStageSimulator; 