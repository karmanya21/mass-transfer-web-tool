import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './DistillationColumnSimulator.css';

const DistillationColumnSimulator = () => {
  // State variables for simulation parameters
  const [slope, setSlope] = useState(0.8); // Slope of equilibrium line (m)
  const [XE, setXE] = useState(0.15); // Feed point X coordinate
  const [YF, setYF] = useState(0.2); // Feed point Y coordinate
  const [XF, setXF] = useState(0.05); // Exit point X coordinate
  const [YE, setYE] = useState(0.08); // Exit point Y coordinate
  const [plotGenerated, setPlotGenerated] = useState(false);
  
  // Reference for D3 visualization
  const visualizationRef = useRef();
  
  // State to store stages for display
  const [stages, setStages] = useState([]);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Calculate the operating line slope
  const calculateOperatingLineSlope = () => {
    return (YF - YE) / (XE - XF);
  };

  // Validate parameters for plot generation
  const validateParameters = () => {
    // Check if both points are above equilibrium line
    if (YE <= slope * XF) {
      setErrorMessage("EXIT point (XF, YE) must be above the equilibrium line.");
      return false;
    }
    
    if (YF <= slope * XE) {
      setErrorMessage("FEED point (XE, YF) must be above the equilibrium line.");
      return false;
    }
    
    // Check if YF > YE and XE > XF
    if (YF <= YE) {
      setErrorMessage("YF must be greater than YE.");
      return false;
    }
    
    if (XE <= XF) {
      setErrorMessage("XE must be greater than XF.");
      return false;
    }
    
    return true;
  };

  // Calculate equilibrium data points
  const calculateEquilibriumData = () => {
    const maxX = Math.max(XE, XF) * 1.2;
    const X_points = Array.from({length: 100}, (_, i) => i * maxX / 99);
    return X_points.map(X => ({ X, Y: slope * X }));
  };

  // Calculate operating line
  const calculateOperatingLine = () => {
    const operatingLineSlope = calculateOperatingLineSlope();
    
    // Generate points for the operating line
    const X_points = Array.from({length: 100}, (_, i) => 
      XF + (XE - XF) * (i / 99));
    
    return {
      operatingLine: X_points.map(X => ({
        X,
        Y: YE + operatingLineSlope * (X - XF)
      })),
      operatingLineSlope
    };
  };

  // Calculate stages using McCabe-Thiele method
  const calculateMcCabeThieleStages = () => {
    const operatingLineSlope = calculateOperatingLineSlope();
    
    const stages = [];
    let currentX = XE;
    let currentY = YF;
    
    stages.push({ X: currentX, Y: currentY, type: "start" });
    
    let counter = 0;
    const MAX_STAGES = 100;
    
    // Continue stepping until we reach or go beyond XF
    while (currentX > XF && counter < MAX_STAGES) {
      // Step to equilibrium line
      const equilibriumY = slope * currentX;
      stages.push({ X: currentX, Y: equilibriumY, type: "equilibrium" });
      
      // If we've reached or gone below the exit Y value, we're done
      if (equilibriumY <= YE) break;
      
      // Step to operating line
      const operatingX = XF + (equilibriumY - YE) / operatingLineSlope;
      
      // If the next X would be less than XF, we need to handle the last stage specially
      if (operatingX <= XF) {
        // Add the intersection with XF vertical line as the last point
        const operatingYAtXF = YE + operatingLineSlope * (XF - XF); // This equals YE
        stages.push({ X: XF, Y: equilibriumY, type: "final" });
        stages.push({ X: XF, Y: YE, type: "end" });
        break;
      }
      
      stages.push({ X: operatingX, Y: equilibriumY, type: "operating" });
      
      currentX = operatingX;
      currentY = equilibriumY;
      counter++;
      
      if (counter >= MAX_STAGES - 1) {
        console.warn("Maximum stage limit reached");
        break;
      }
    }
    
    // Ensure we've reached the exit point
    const lastStage = stages[stages.length - 1];
    if (lastStage.X !== XF || lastStage.Y !== YE) {
      stages.push({ X: XF, Y: YE, type: "end" });
    }
    
    return stages;
  };

  // Generate plot when button is clicked
  const generatePlot = () => {
    if (!validateParameters()) {
      setShowError(true);
      setPlotGenerated(false);
      return;
    }
    
    setShowError(false);
    setPlotGenerated(true);
    updateVisualization();
  };

  // D3 visualization
  const updateVisualization = () => {
    if (!visualizationRef.current) return;
    
    const svg = d3.select(visualizationRef.current);
    svg.selectAll("*").remove();
    
    if (!plotGenerated) return;

    // Visualization setup
    const width = 600, height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    
    const equilibriumData = calculateEquilibriumData();
    const { operatingLine } = calculateOperatingLine();
    const calculatedStages = calculateMcCabeThieleStages();
    
    setStages(calculatedStages);
    
    // Set scales
    const xMax = Math.max(XE * 1.1, ...equilibriumData.map(d => d.X));
    const yMax = Math.max(YF * 1.1, ...equilibriumData.map(d => d.Y));
    
    const xScale = d3.scaleLinear()
      .domain([0, xMax])
      .range([margin.left, width - margin.right]);
    
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);

    // Draw axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale));
    
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));
      
    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .text("X (mole ratio)");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .text("Y (mole ratio)");

    // Add title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("font-weight", "bold")
      .text("McCabe-Thiele Diagram (Concurrent Flow)");

    // Draw equilibrium line
    const line = d3.line()
      .x(d => xScale(d.X))
      .y(d => yScale(d.Y));
      
    svg.append("path")
      .datum(equilibriumData)
      .attr("d", line)
      .attr("stroke", "blue")
      .attr("stroke-width", 2)
      .attr("fill", "none");

    // Draw operating line
    svg.append("path")
      .datum(operatingLine)
      .attr("d", line)
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("fill", "none");

    // Draw stages
    for (let i = 0; i < calculatedStages.length - 1; i++) {
      const current = calculatedStages[i];
      const next = calculatedStages[i + 1];
      
      if (current.type === "start" || current.type === "operating") {
        if (next.type === "equilibrium") {
          // Vertical line down to equilibrium
          svg.append("line")
            .attr("x1", xScale(current.X))
            .attr("x2", xScale(current.X))
            .attr("y1", yScale(current.Y))
            .attr("y2", yScale(next.Y))
            .attr("stroke", "green")
            .attr("stroke-width", 1.5);
        }
      } else if (current.type === "equilibrium") {
        if (next.type === "operating" || next.type === "final" || next.type === "end") {
          // Horizontal line to next point
          svg.append("line")
            .attr("x1", xScale(current.X))
            .attr("x2", xScale(next.X))
            .attr("y1", yScale(current.Y))
            .attr("y2", yScale(current.Y))
            .attr("stroke", "green")
            .attr("stroke-width", 1.5);
        }
      } else if (current.type === "final") {
        // Vertical line from final horizontal line to exit point
        svg.append("line")
          .attr("x1", xScale(current.X))
          .attr("x2", xScale(current.X))
          .attr("y1", yScale(current.Y))
          .attr("y2", yScale(next.Y))
          .attr("stroke", "green")
          .attr("stroke-width", 1.5);
      }
    }

    // Add points
    calculatedStages.forEach(stage => {
      svg.append("circle")
        .attr("cx", xScale(stage.X))
        .attr("cy", yScale(stage.Y))
        .attr("r", 4)
        .attr("fill", stage.type === "start" ? "purple" : 
                     stage.type === "equilibrium" ? "green" : "orange");
    });
    
    // Add special points
    // Feed point (XE, YF)
    svg.append("circle")
      .attr("cx", xScale(XE))
      .attr("cy", yScale(YF))
      .attr("r", 6)
      .attr("fill", "purple");

    svg.append("text")
      .attr("x", xScale(XE) + 10)
      .attr("y", yScale(YF) - 10)
      .text("Feed (XE, YF)");

    // Exit point (XF, YE)
    svg.append("circle")
      .attr("cx", xScale(XF))
      .attr("cy", yScale(YE))
      .attr("r", 6)
      .attr("fill", "orange");

    svg.append("text")
      .attr("x", xScale(XF) + 10)
      .attr("y", yScale(YE) - 10)
      .text("Exit (XF, YE)");
      
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.right - 120},${margin.top + 10})`);

    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 20)
      .attr("y2", 0)
      .attr("stroke", "blue")
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 4)
      .text("Equilibrium Line (Y = m·X)");

    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 20)
      .attr("x2", 20)
      .attr("y2", 20)
      .attr("stroke", "red")
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 24)
      .text("Operating Line");

    legend.append("line")
      .attr("x1", 0)
      .attr("y1", 40)
      .attr("x2", 20)
      .attr("y2", 40)
      .attr("stroke", "green")
      .attr("stroke-width", 1.5);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 44)
      .text("Stage Steps");
  };

  // Calculate minimum YE and YF values to be above equilibrium line
  const getMinimumYE = () => {
    return slope * XF * 1.05; // 5% above equilibrium line at XF
  };
  
  const getMinimumYF = () => {
    return slope * XE * 1.05; // 5% above equilibrium line at XE
  };

  // Count the stages (horizontal lines)
  const countStages = () => {
    if (!stages || stages.length <= 1) return 0;
    
    let count = 0;
    for (let i = 0; i < stages.length - 1; i++) {
      if (stages[i].type === "equilibrium" && 
          (stages[i+1].type === "operating" || stages[i+1].type === "final" || stages[i+1].type === "end")) {
        count++;
      }
    }
    
    return count;
  };

  return (
    <div className="simulator-container">
      <h1>McCabe-Thiele Method Simulator (Concurrent Flow)</h1>
      
      <div className="simulation-layout">
        <div className="controls-panel">
          <h3>Parameters</h3>
          
          <div className="parameter">
            <label>Slope of Equilibrium Line (m):</label>
            <input type="range" min="0.1" max="2" step="0.05" 
              value={slope} onChange={e => setSlope(parseFloat(e.target.value))} />
            <span>{slope.toFixed(2)}</span>
          </div>

          <div className="section-header">FEED Point Coordinates</div>
          
          <div className="parameter">
            <label>XE (Feed Point X-coordinate):</label>
            <input type="range" min={XF * 1.05} max="0.5" step="0.01"
              value={XE} onChange={e => setXE(parseFloat(e.target.value))} />
            <span>{XE.toFixed(3)}</span>
          </div>

          <div className="parameter">
            <label>YF (Feed Point Y-coordinate):</label>
            <input type="range" min={Math.max(YE * 1.05, getMinimumYF())} max="0.5" step="0.01"
              value={YF} onChange={e => setYF(parseFloat(e.target.value))} />
            <span>{YF.toFixed(3)}</span>
            <div className="parameter-hint">
              Minimum YF: {Math.max(YE * 1.05, getMinimumYF()).toFixed(3)}
            </div>
          </div>

          <div className="section-header">EXIT Point Coordinates</div>

          <div className="parameter">
            <label>XF (Exit Point X-coordinate):</label>
            <input type="range" min="0.001" max={XE * 0.95} step="0.001"
              value={XF} onChange={e => setXF(parseFloat(e.target.value))} />
            <span>{XF.toFixed(3)}</span>
          </div>

          <div className="parameter">
            <label>YE (Exit Point Y-coordinate):</label>
            <input type="range" min={getMinimumYE()} max={YF * 0.95} step="0.01"
              value={YE} onChange={e => setYE(parseFloat(e.target.value))} />
            <span>{YE.toFixed(3)}</span>
            <div className="parameter-hint">
              Minimum YE: {getMinimumYE().toFixed(3)} (above equilibrium at XF)
            </div>
          </div>

          <div className="parameter">
            <button className="generate-button" onClick={generatePlot}>
              Generate Plot
            </button>
          </div>

          {showError && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          {plotGenerated && (
            <div className="calculated-values">
              <h4>Results:</h4>
              <p>Operating Line Slope: {calculateOperatingLineSlope().toFixed(4)}</p>
              <p>Number of Stages (McCabe-Thiele): {countStages()}</p>
            </div>
          )}
        </div>

        <div className="visualization-panel">
          <svg ref={visualizationRef} width="600" height="400"></svg>
          
          {plotGenerated && (
            <div className="visualization-description">
              <p>
                The plot shows the McCabe-Thiele diagram for concurrent flow with:
                <ul>
                  <li>Equilibrium Line (blue): Y = {slope.toFixed(2)}·X</li>
                  <li>Operating Line (red): Connects (XF, YE) and (XE, YF)</li>
                  <li>Feed Point: (XE = {XE.toFixed(3)}, YF = {YF.toFixed(3)})</li>
                  <li>Exit Point: (XF = {XF.toFixed(3)}, YE = {YE.toFixed(3)})</li>
                  <li>Each horizontal line represents one theoretical stage</li>
                </ul>
              </p>
            </div>
          )}
          
          {!plotGenerated && !showError && (
            <div className="placeholder-message">
              Set your parameters and click "Generate Plot" to see the McCabe-Thiele diagram
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistillationColumnSimulator; 