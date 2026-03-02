import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Activity, Brain, TrendingUp, Settings, AlertTriangle, ChevronRight } from 'lucide-react';
import { create, all } from 'mathjs';
import { GoogleGenAI } from "@google/genai";

// Initialize mathjs
const math = create(all);

// --- Types ---

type SystemState = {
  x: number;
  y: number;
  z: number;
};

type AnalysisResult = {
  classification: 'Stable' | 'Periodic' | 'Chaotic' | 'Unknown';
  lyapunovExponent: number;
  explanation: string;
};

// --- Constants ---

const PRESETS = {
  lorenz: {
    name: "Lorenz Attractor",
    equations: {
      dx: "sigma * (y - x)",
      dy: "x * (rho - z) - y",
      dz: "x * y - beta * z"
    },
    constants: { sigma: 10, rho: 28, beta: 8/3 },
    initialState: { x: 0.1, y: 0, z: 0 },
    cameraScale: 15,
    bifurcationParam: "rho",
    bifurcationRange: [0, 50]
  },
  rossler: {
    name: "Rössler Attractor",
    equations: {
      dx: "-y - z",
      dy: "x + a * y",
      dz: "b + z * (x - c)"
    },
    constants: { a: 0.2, b: 0.2, c: 5.7 },
    initialState: { x: 0.1, y: 0.1, z: 0.1 },
    cameraScale: 10,
    bifurcationParam: "c",
    bifurcationRange: [2, 10]
  },
  chen: {
    name: "Chen Attractor",
    equations: {
      dx: "a * (y - x)",
      dy: "(c - a) * x - x * z + c * y",
      dz: "x * y - b * z"
    },
    constants: { a: 35, b: 3, c: 28 },
    initialState: { x: -10, y: 0, z: 30 },
    cameraScale: 12,
    bifurcationParam: "c",
    bifurcationRange: [20, 40]
  }
};

// --- Helper Functions ---

// RK4 Integrator for custom equations
const rk4 = (
  state: SystemState,
  dt: number,
  compiledEqs: { dx: math.EvalFunction; dy: math.EvalFunction; dz: math.EvalFunction },
  constants: Record<string, number>
): SystemState => {
  const { x, y, z } = state;
  const scope = { ...constants, x, y, z };

  const k1x = compiledEqs.dx.evaluate(scope);
  const k1y = compiledEqs.dy.evaluate(scope);
  const k1z = compiledEqs.dz.evaluate(scope);

  const scope2 = { ...constants, x: x + k1x * dt * 0.5, y: y + k1y * dt * 0.5, z: z + k1z * dt * 0.5 };
  const k2x = compiledEqs.dx.evaluate(scope2);
  const k2y = compiledEqs.dy.evaluate(scope2);
  const k2z = compiledEqs.dz.evaluate(scope2);

  const scope3 = { ...constants, x: x + k2x * dt * 0.5, y: y + k2y * dt * 0.5, z: z + k2z * dt * 0.5 };
  const k3x = compiledEqs.dx.evaluate(scope3);
  const k3y = compiledEqs.dy.evaluate(scope3);
  const k3z = compiledEqs.dz.evaluate(scope3);

  const scope4 = { ...constants, x: x + k3x * dt, y: y + k3y * dt, z: z + k3z * dt };
  const k4x = compiledEqs.dx.evaluate(scope4);
  const k4y = compiledEqs.dy.evaluate(scope4);
  const k4z = compiledEqs.dz.evaluate(scope4);

  return {
    x: x + (k1x + 2 * k2x + 2 * k3x + k4x) * dt / 6,
    y: y + (k1y + 2 * k2y + 2 * k3y + k4y) * dt / 6,
    z: z + (k1z + 2 * k2z + 2 * k3z + k4z) * dt / 6
  };
};

// --- Main Component ---

interface Props {
  onBack: () => void;
}

const DynamicalSystemsChaos: React.FC<Props> = ({ onBack }) => {
  // State
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS>('lorenz');
  const [equations, setEquations] = useState(PRESETS.lorenz.equations);
  const [constants, setConstants] = useState<Record<string, number>>(PRESETS.lorenz.constants);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed] = useState(1);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBifurcation, setShowBifurcation] = useState(false);
  const [bifurcationData, setBifurcationData] = useState<{ param: number; x: number }[]>([]);
  const [isGeneratingBifurcation, setIsGeneratingBifurcation] = useState(false);
  const [lyapunovValue, setLyapunovValue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for simulation loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const pointsRef = useRef<SystemState[]>([]);
  const currentStateRef = useRef<SystemState>(PRESETS.lorenz.initialState);
  
  // Refs for Lyapunov calculation (shadow trajectory)
  const shadowStateRef = useRef<SystemState>({ ...PRESETS.lorenz.initialState, x: PRESETS.lorenz.initialState.x + 1e-8 });
  const lyapunovSumRef = useRef<number>(0);
  const lyapunovStepsRef = useRef<number>(0);

  // Compiled equations ref
  const compiledEqsRef = useRef<{ dx: math.EvalFunction; dy: math.EvalFunction; dz: math.EvalFunction } | null>(null);

  // Initialize compiled equations
  useEffect(() => {
    try {
      compiledEqsRef.current = {
        dx: math.compile(equations.dx),
        dy: math.compile(equations.dy),
        dz: math.compile(equations.dz)
      };
      setError(null);
    } catch (err) {
      setError("Invalid equation syntax");
      compiledEqsRef.current = null;
    }
  }, [equations]);

  // Reset simulation when preset changes
  useEffect(() => {
    const preset = PRESETS[selectedPreset];
    setEquations(preset.equations);
    setConstants(preset.constants);
    currentStateRef.current = preset.initialState;
    shadowStateRef.current = { ...preset.initialState, x: preset.initialState.x + 1e-8 };
    pointsRef.current = [];
    lyapunovSumRef.current = 0;
    lyapunovStepsRef.current = 0;
    setLyapunovValue(null);
    setAnalysisResult(null);
    setBifurcationData([]);
    setShowBifurcation(false);
    setIsPlaying(false);
    
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [selectedPreset]);

  // Simulation Loop
  const animate = useCallback(() => {
    if (!compiledEqsRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    const dt = 0.01 * simulationSpeed;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const scale = PRESETS[selectedPreset].cameraScale;

    // Run multiple steps per frame for smoothness
    const stepsPerFrame = 10;

    ctx.beginPath();
    ctx.strokeStyle = `hsl(${pointsRef.current.length % 360}, 70%, 60%)`;
    ctx.lineWidth = 1.5;

    // Move to current position
    // Simple projection: x -> x, z -> y (standard for Lorenz)
    let startX = width / 2 + currentStateRef.current.x * scale;
    let startY = height - (currentStateRef.current.z * scale + 50); // Offset for better view
    
    // Adjust projection for other attractors if needed
    if (selectedPreset === 'rossler') {
       startY = height / 2 - currentStateRef.current.y * scale;
       startX = width / 2 + currentStateRef.current.x * scale;
    } else if (selectedPreset === 'chen') {
       startY = height / 2 - currentStateRef.current.z * scale + 200;
       startX = width / 2 + currentStateRef.current.x * scale;
    }

    ctx.moveTo(startX, startY);

    for (let i = 0; i < stepsPerFrame; i++) {
      // 1. Update main trajectory
      currentStateRef.current = rk4(currentStateRef.current, dt, compiledEqsRef.current, constants);
      pointsRef.current.push(currentStateRef.current);
      if (pointsRef.current.length > 2000) pointsRef.current.shift();

      // 2. Update shadow trajectory for Lyapunov
      shadowStateRef.current = rk4(shadowStateRef.current, dt, compiledEqsRef.current, constants);

      // 3. Calculate separation
      const d0 = 1e-8;
      const dx = currentStateRef.current.x - shadowStateRef.current.x;
      const dy = currentStateRef.current.y - shadowStateRef.current.y;
      const dz = currentStateRef.current.z - shadowStateRef.current.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      // 4. Accumulate Lyapunov exponent
      if (dist > 0) {
        lyapunovSumRef.current += Math.log(dist / d0);
        lyapunovStepsRef.current++;
        
        // Rescale shadow trajectory to maintain small separation
        const factor = d0 / dist;
        shadowStateRef.current = {
          x: currentStateRef.current.x + (shadowStateRef.current.x - currentStateRef.current.x) * factor,
          y: currentStateRef.current.y + (shadowStateRef.current.y - currentStateRef.current.y) * factor,
          z: currentStateRef.current.z + (shadowStateRef.current.z - currentStateRef.current.z) * factor
        };
      }

      // Draw line
      let drawX = width / 2 + currentStateRef.current.x * scale;
      let drawY = height - (currentStateRef.current.z * scale + 50);
      if (selectedPreset === 'rossler') {
        drawY = height / 2 - currentStateRef.current.y * scale;
        drawX = width / 2 + currentStateRef.current.x * scale;
      } else if (selectedPreset === 'chen') {
        drawY = height / 2 - currentStateRef.current.z * scale + 200;
        drawX = width / 2 + currentStateRef.current.x * scale;
      }
      ctx.lineTo(drawX, drawY);
    }
    
    ctx.stroke();

    // Update Lyapunov display every 60 frames
    if (pointsRef.current.length % 60 === 0 && lyapunovStepsRef.current > 0) {
      const lambda = lyapunovSumRef.current / (lyapunovStepsRef.current * dt * stepsPerFrame);
      // The above formula is sum(ln(d1/d0)) / (N * dt). 
      // lyapunovStepsRef counts the number of renormalization steps.
      // Each step is dt time.
      // Wait, lyapunovStepsRef increments every sub-step.
      // So total time T = lyapunovStepsRef * dt.
      // Correct.
      setLyapunovValue(lambda);
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [simulationSpeed, constants, selectedPreset]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);


  // --- AI Analysis ---

  const analyzeSystem = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Analyze the following dynamical system and classify it as Stable, Periodic, or Chaotic.
        
        Equations:
        dx/dt = ${equations.dx}
        dy/dt = ${equations.dy}
        dz/dt = ${equations.dz}

        Parameters:
        ${JSON.stringify(constants, null, 2)}

        Calculated Max Lyapunov Exponent (approx): ${lyapunovValue ? lyapunovValue.toFixed(4) : "Not yet calculated"}

        Provide a JSON response with the following structure:
        {
          "classification": "Stable" | "Periodic" | "Chaotic",
          "lyapunovExponent": number (your theoretical estimate if known, otherwise use provided),
          "explanation": "Brief explanation of why based on the parameters and equations."
        }
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const responseText = result.text;
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        setAnalysisResult(data);
      } else {
        throw new Error("Failed to parse AI response");
      }

    } catch (err) {
      console.error("AI Analysis failed:", err);
      setError("AI Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };


  // --- Bifurcation Diagram Generation ---

  const generateBifurcation = async () => {
    if (!compiledEqsRef.current) return;
    setIsGeneratingBifurcation(true);
    setBifurcationData([]);
    setShowBifurcation(true);

    // Use a timeout to allow UI to update before heavy calculation
    setTimeout(() => {
      const preset = PRESETS[selectedPreset];
      const paramName = preset.bifurcationParam;
      const [min, max] = preset.bifurcationRange;
      const steps = 150; // Resolution of parameter sweep
      const settleTime = 500; // Steps to discard transients
      const sampleTime = 100; // Steps to record local maxima
      const dt = 0.01;

      const maximaData: { param: number; x: number }[] = [];

       for (let i = 0; i < steps; i++) {
        const paramVal = min + (max - min) * (i / steps);
        const currentConstants = { ...constants, [paramName]: paramVal };
        let state = { ...preset.initialState };
        
        // Settle
        for (let t = 0; t < settleTime; t++) state = rk4(state, dt, compiledEqsRef.current!, currentConstants);

        // Record peaks
        let p1 = state.x;
        state = rk4(state, dt, compiledEqsRef.current!, currentConstants);
        let p2 = state.x;
        
        for (let t = 0; t < sampleTime; t++) {
          state = rk4(state, dt, compiledEqsRef.current!, currentConstants);
          const p3 = state.x;
          // Simple peak detection: p2 is higher than p1 and p3
          if (p2 > p1 && p2 > p3) {
            maximaData.push({ param: paramVal, x: p2 });
          }
          p1 = p2;
          p2 = p3;
        }
      }

      setBifurcationData(maximaData);
      setIsGeneratingBifurcation(false);
    }, 100);
  };


  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Dynamical Systems & Chaos
            </h2>
            <p className="text-slate-500 text-sm">Simulate, Analyze, and Classify Chaotic Behavior</p>
          </div>
        </div>
        <div className="flex gap-2">
           <select 
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value as keyof typeof PRESETS)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            {Object.entries(PRESETS).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Configuration & Analysis */}
        <div className="w-1/3 min-w-[350px] bg-white border-r border-slate-200 overflow-y-auto p-6 flex flex-col gap-8">
          
          {/* Equations Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" /> System Equations
            </h3>
            <div className="space-y-3">
              {(['dx', 'dy', 'dz'] as const).map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="font-mono text-slate-500 w-12 text-right">{v}/dt =</span>
                  <input
                    type="text"
                    value={equations[v]}
                    onChange={(e) => setEquations({ ...equations, [v]: e.target.value })}
                    className="flex-1 font-mono text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ))}
            </div>
            {error && (
              <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {error}
              </div>
            )}
          </section>

          {/* Parameters Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(constants).map(([key, val]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate-500">{key}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={val}
                    onChange={(e) => setConstants({ ...constants, [key]: parseFloat(e.target.value) || 0 })}
                    className="font-mono text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Analysis Section */}
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" /> AI Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Lyapunov Exponent (est):</span>
                <span className={`font-mono font-medium ${
                  lyapunovValue && lyapunovValue > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {lyapunovValue ? lyapunovValue.toFixed(4) : 'Calculating...'}
                </span>
              </div>

              {analysisResult ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                      analysisResult.classification === 'Chaotic' ? 'bg-red-100 text-red-700' :
                      analysisResult.classification === 'Stable' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {analysisResult.classification}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {analysisResult.explanation}
                  </p>
                </div>
              ) : (
                <button
                  onClick={analyzeSystem}
                  disabled={isAnalyzing}
                  className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Analyze System Stability</>
                  )}
                </button>
              )}
            </div>
          </section>

           {/* Bifurcation Button */}
           <section>
            <button
              onClick={generateBifurcation}
              disabled={isGeneratingBifurcation}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isGeneratingBifurcation ? (
                 <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Generate Bifurcation Diagram
            </button>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Varying parameter: <span className="font-mono text-slate-600">{PRESETS[selectedPreset].bifurcationParam}</span>
            </p>
          </section>

        </div>

        {/* Right Panel: Visualization */}
        <div className="flex-1 bg-slate-900 relative flex flex-col">
          
          {/* Overlay Controls */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={() => {
                pointsRef.current = [];
                currentStateRef.current = PRESETS[selectedPreset].initialState;
                shadowStateRef.current = { ...PRESETS[selectedPreset].initialState, x: PRESETS[selectedPreset].initialState.x + 1e-8 };
                lyapunovSumRef.current = 0;
                lyapunovStepsRef.current = 0;
                setLyapunovValue(null);
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }}
              className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Canvas */}
          {!showBifurcation ? (
            <div className="flex-1 relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full block"
              />
              <div className="absolute bottom-4 right-4 text-white/50 text-xs font-mono pointer-events-none">
                Phase Space Projection (X-Z)
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white p-8 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-900">Bifurcation Diagram</h3>
                 <button 
                   onClick={() => setShowBifurcation(false)}
                   className="text-sm text-slate-500 hover:text-slate-900"
                 >
                   Close
                 </button>
              </div>
              
              <div className="flex-1 border border-slate-200 rounded-lg bg-slate-50 relative">
                 {/* Simple SVG Plot for Bifurcation */}
                 {bifurcationData.length > 0 ? (
                   <svg className="w-full h-full p-4" viewBox={`0 0 100 100`} preserveAspectRatio="none">
                      {bifurcationData.map((pt, i) => {
                        // Normalize data to 0-100 range
                        const preset = PRESETS[selectedPreset];
                        const [minParam, maxParam] = preset.bifurcationRange;
                        const x = ((pt.param - minParam) / (maxParam - minParam)) * 100;
                        
                        // Normalize Y (value) - need min/max of data
                        // For Lorenz/Rossler, values are roughly -20 to 50. Let's auto-scale or fix scale.
                        // Fixed scale is safer for stability visualization.
                        const yMin = -30;
                        const yMax = 50;
                        const y = 100 - ((pt.x - yMin) / (yMax - yMin)) * 100;

                        return (
                          <circle key={i} cx={x} cy={y} r="0.4" fill="rgba(79, 70, 229, 0.6)" />
                        );
                      })}
                   </svg>
                 ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                     Generating data...
                   </div>
                 )}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                 <span>{PRESETS[selectedPreset].bifurcationParam} = {PRESETS[selectedPreset].bifurcationRange[0]}</span>
                 <span>{PRESETS[selectedPreset].bifurcationParam} = {PRESETS[selectedPreset].bifurcationRange[1]}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DynamicalSystemsChaos;
