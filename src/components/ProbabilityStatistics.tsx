import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Settings, 
  Terminal, 
  BarChart2, 
  Activity, 
  Dices, 
  ChevronRight, 
  Save,
  Trash2,
  Maximize2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

import Coin3D from './probability/Coin3D';
import Dice3D from './probability/Dice3D';

// --- Types ---
type SimulationType = 'coin' | 'dice' | 'normal' | 'clt';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface SimulationState {
  isRunning: boolean;
  progress: number;
  data: any[];
  stats: {
    mean: number;
    stdDev: number;
    count: number;
  };
  lastResult?: number; // For 3D visualization
}

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatTime = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const calculateMean = (data: number[]) => data.reduce((a, b) => a + b, 0) / (data.length || 1);
const calculateStdDev = (data: number[], mean: number) => {
  const squareDiffs = data.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

// Gaussian random (Box-Muller transform)
const randomNormal = (mean: number, stdDev: number) => {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
};

// --- Main Component ---
interface Props {
  onBack: () => void;
}

export default function ProbabilityStatistics({ onBack }: Props) {
  // --- State ---
  const [activeSim, setActiveSim] = useState<SimulationType>('coin');
  const [viewMode, setViewMode] = useState<'chart' | '3d'>('chart');
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'init', timestamp: formatTime(), message: 'RStudio-Lite Environment Initialized. Ready for simulation.', type: 'info' }
  ]);
  
  // Simulation Configs
  const [config, setConfig] = useState({
    coin: { trials: 100, probability: 0.5 },
    dice: { trials: 100, sides: 6 },
    normal: { samples: 1000, mean: 0, stdDev: 1 },
    clt: { parentSamples: 10000, sampleSize: 30, numberOfSamples: 500 } // Parent is Uniform(0,1)
  });

  // Runtime State
  const [simState, setSimState] = useState<SimulationState>({
    isRunning: false,
    progress: 0,
    data: [],
    stats: { mean: 0, stdDev: 0, count: 0 },
    lastResult: undefined
  });

  const animationRef = useRef<number>(0);
  const rawDataRef = useRef<number[]>([]);

  // --- Logging ---
  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ id: generateId(), timestamp: formatTime(), message, type }, ...prev]);
  };

  // --- Simulation Logic ---
  const stopSimulation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setSimState(prev => ({ ...prev, isRunning: false }));
    addLog('Simulation stopped by user.', 'error');
  };

  const clearData = () => {
    rawDataRef.current = [];
    setSimState({
      isRunning: false,
      progress: 0,
      data: [],
      stats: { mean: 0, stdDev: 0, count: 0 },
      lastResult: undefined
    });
    addLog('Workspace cleared.', 'info');
  };

  const runSimulation = () => {
    if (simState.isRunning) return;
    
    clearData();
    setSimState(prev => ({ ...prev, isRunning: true }));
    addLog(`Starting ${activeSim.toUpperCase()} simulation...`, 'info');

    let currentIter = 0;
    const batchSize = activeSim === 'clt' ? 5 : 10; // Speed factor
    let maxIter = 0;

    // Setup based on type
    if (activeSim === 'coin') maxIter = config.coin.trials;
    else if (activeSim === 'dice') maxIter = config.dice.trials;
    else if (activeSim === 'normal') maxIter = config.normal.samples;
    else if (activeSim === 'clt') maxIter = config.clt.numberOfSamples;

    const processBatch = () => {
      const newValues: number[] = [];
      
      for (let i = 0; i < batchSize; i++) {
        if (currentIter >= maxIter) break;

        let val = 0;
        if (activeSim === 'coin') {
          val = Math.random() < config.coin.probability ? 1 : 0; // 1=Heads
        } else if (activeSim === 'dice') {
          val = Math.floor(Math.random() * config.dice.sides) + 1;
        } else if (activeSim === 'normal') {
          val = randomNormal(config.normal.mean, config.normal.stdDev);
        } else if (activeSim === 'clt') {
          // Sample mean from Uniform(0,100)
          let sum = 0;
          for(let j=0; j<config.clt.sampleSize; j++) {
            sum += Math.random() * 100; 
          }
          val = sum / config.clt.sampleSize;
        }
        
        newValues.push(val);
        currentIter++;
      }

      // Update Refs
      rawDataRef.current = [...rawDataRef.current, ...newValues];

      // Process for Visualization
      let chartData: any[] = [];
      const allData = rawDataRef.current;
      const mean = calculateMean(allData);
      const stdDev = calculateStdDev(allData, mean);

      if (activeSim === 'coin') {
        const heads = allData.filter(x => x === 1).length;
        const tails = allData.length - heads;
        const total = allData.length;
        chartData = [
          { 
            name: 'Heads', 
            value: heads, 
            expected: total * config.coin.probability,
            fill: '#10b981' 
          },
          { 
            name: 'Tails', 
            value: tails, 
            expected: total * (1 - config.coin.probability),
            fill: '#ef4444' 
          }
        ];
      } else if (activeSim === 'dice') {
        const counts: Record<number, number> = {};
        for(let k=1; k<=config.dice.sides; k++) counts[k] = 0;
        allData.forEach(v => counts[v] = (counts[v] || 0) + 1);
        
        const total = allData.length;
        const expectedPerSide = total / config.dice.sides;
        
        chartData = Object.keys(counts).map(k => ({ 
          name: k, 
          value: counts[parseInt(k)],
          expected: expectedPerSide
        }));
      } else if (activeSim === 'normal' || activeSim === 'clt') {
        // Create histogram buckets
        const min = Math.min(...allData);
        const max = Math.max(...allData);
        const range = max - min || 1;
        const bucketCount = 20;
        const bucketSize = range / bucketCount;
        
        const buckets = new Array(bucketCount).fill(0);
        allData.forEach(v => {
          const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
          if (idx >= 0) buckets[idx]++;
        });

        chartData = buckets.map((count, i) => ({
          name: (min + i * bucketSize).toFixed(1),
          value: count,
          pdf: activeSim === 'normal' ? undefined : undefined // Could overlay ideal PDF later
        }));
      }

      setSimState({
        isRunning: true,
        progress: (currentIter / maxIter) * 100,
        data: chartData,
        stats: { mean, stdDev, count: currentIter },
        lastResult: newValues[newValues.length - 1]
      });

      if (currentIter < maxIter) {
        animationRef.current = requestAnimationFrame(processBatch);
      } else {
        setSimState(prev => ({ ...prev, isRunning: false }));
        addLog(`Simulation complete. Processed ${maxIter} samples.`, 'success');
      }
    };

    animationRef.current = requestAnimationFrame(processBatch);
  };

  // --- Render Helpers ---
  const renderControls = () => {
    return (
      <div className="space-y-6">
        {activeSim === 'coin' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Number of Flips (n)</label>
              <input 
                type="number" 
                value={config.coin.trials}
                onChange={e => setConfig({...config, coin: {...config.coin, trials: parseInt(e.target.value)}})}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Probability of Heads (p)</label>
              <input 
                type="range" 
                min="0" max="1" step="0.01"
                value={config.coin.probability}
                onChange={e => setConfig({...config, coin: {...config.coin, probability: parseFloat(e.target.value)}})}
                className="w-full mt-2 accent-indigo-500"
              />
              <div className="text-right text-xs text-slate-400">{config.coin.probability}</div>
            </div>
          </>
        )}

        {activeSim === 'dice' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Number of Rolls</label>
              <input 
                type="number" 
                value={config.dice.trials}
                onChange={e => setConfig({...config, dice: {...config.dice, trials: parseInt(e.target.value)}})}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sides (d)</label>
              <select 
                value={config.dice.sides}
                onChange={e => setConfig({...config, dice: {...config.dice, sides: parseInt(e.target.value)}})}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {[4, 6, 8, 10, 12, 20].map(s => <option key={s} value={s}>{s}-sided</option>)}
              </select>
            </div>
          </>
        )}

        {activeSim === 'normal' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sample Size (n)</label>
              <input 
                type="number" 
                value={config.normal.samples}
                onChange={e => setConfig({...config, normal: {...config.normal, samples: parseInt(e.target.value)}})}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mean (μ)</label>
                <input 
                  type="number" 
                  value={config.normal.mean}
                  onChange={e => setConfig({...config, normal: {...config.normal, mean: parseFloat(e.target.value)}})}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Std Dev (σ)</label>
                <input 
                  type="number" 
                  value={config.normal.stdDev}
                  onChange={e => setConfig({...config, normal: {...config.normal, stdDev: parseFloat(e.target.value)}})}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </>
        )}

        {activeSim === 'clt' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Number of Samples (k)</label>
              <input 
                type="number" 
                value={config.clt.numberOfSamples}
                onChange={e => setConfig({...config, clt: {...config.clt, numberOfSamples: parseInt(e.target.value)}})}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sample Size (n)</label>
              <input 
                type="number" 
                value={config.clt.sampleSize}
                onChange={e => setConfig({...config, clt: {...config.clt, sampleSize: parseInt(e.target.value)}})}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Each point in the plot is the mean of {config.clt.sampleSize} random numbers.
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* --- Header --- */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <span className="font-bold text-white">R</span>
            </div>
            <span className="font-semibold text-slate-200">Studio Lite</span>
            <span className="text-slate-600 mx-2">|</span>
            <span className="text-slate-400 text-sm">Probability Simulator</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {['coin', 'dice', 'normal', 'clt'].map((sim) => (
            <button
              key={sim}
              onClick={() => { setActiveSim(sim as SimulationType); clearData(); }}
              className={`px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wide transition-all ${
                activeSim === sim 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {sim}
            </button>
          ))}
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane (Controls & Console) */}
        <div className="w-80 md:w-96 flex flex-col border-r border-slate-800 bg-slate-900/50">
          
          {/* Top-Left: Source / Controls */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
            <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <Settings className="w-3 h-3" /> Parameters
              </span>
              <div className="flex gap-1">
                <button onClick={clearData} className="p-1 hover:bg-slate-800 rounded text-slate-500" title="Clear">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {renderControls()}
              
              <div className="mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={simState.isRunning ? stopSimulation : runSimulation}
                  className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                    simState.isRunning 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'
                  }`}
                >
                  {simState.isRunning ? (
                    <>Stop Simulation</>
                  ) : (
                    <><Play className="w-4 h-4" /> Run Simulation</>
                  )}
                </button>
                
                {simState.isRunning && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(simState.progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${simState.progress}%` }}
                        transition={{ type: 'tween', ease: 'linear' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom-Left: Console */}
          <div className="h-1/3 min-h-[200px] flex flex-col bg-slate-950">
            <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 shrink-0">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Console
              </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                    ${log.type === 'info' ? 'text-slate-300' : ''}
                  `}>
                    <span className="text-indigo-500 mr-2">❯</span>
                    {log.message}
                  </span>
                </div>
              ))}
              <div className="h-4" /> {/* Spacer */}
            </div>
          </div>
        </div>

        {/* Right Pane (Plots & Environment) */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/30">
          
          {/* Top-Right: Environment / Stats */}
          <div className="h-1/4 min-h-[150px] border-b border-slate-800 flex flex-col">
            <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 shrink-0">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Environment / Statistics
              </span>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              {simState.stats.count > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Count (n)</div>
                    <div className="text-2xl font-mono text-slate-200">{simState.stats.count.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Mean (μ)</div>
                    <div className="text-2xl font-mono text-indigo-400">{simState.stats.mean.toFixed(4)}</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Std Dev (σ)</div>
                    <div className="text-2xl font-mono text-emerald-400">{simState.stats.stdDev.toFixed(4)}</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Variance (σ²)</div>
                    <div className="text-2xl font-mono text-purple-400">{Math.pow(simState.stats.stdDev, 2).toFixed(4)}</div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
                  No data in environment. Run a simulation to generate statistics.
                </div>
              )}
            </div>
          </div>

          {/* Bottom-Right: Plots */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <BarChart2 className="w-3 h-3" /> Plots
              </span>
              <div className="flex gap-2 items-center">
                {(activeSim === 'coin' || activeSim === 'dice') && (
                  <div className="flex bg-slate-800 rounded p-0.5 mr-2">
                    <button
                      onClick={() => setViewMode('chart')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${viewMode === 'chart' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      Chart
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${viewMode === '3d' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      3D View
                    </button>
                  </div>
                )}
                <button className="p-1 hover:bg-slate-800 rounded text-slate-500" title="Export">
                  <Save className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 relative">
              {viewMode === '3d' && (activeSim === 'coin' || activeSim === 'dice') ? (
                <div className="w-full h-full min-h-[300px]">
                  {activeSim === 'coin' && (
                    <Coin3D 
                      result={simState.lastResult ?? null} 
                      isFlipping={simState.isRunning} 
                    />
                  )}
                  {activeSim === 'dice' && (
                    <Dice3D 
                      result={simState.lastResult ?? null} 
                      isRolling={simState.isRunning} 
                      sides={config.dice.sides} 
                    />
                  )}
                </div>
              ) : (
                simState.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {(activeSim === 'coin' || activeSim === 'dice') ? (
                      <BarChart data={simState.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          tick={{ fill: '#94a3b8', fontSize: 12 }} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          tick={{ fill: '#94a3b8', fontSize: 12 }} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                          cursor={{ fill: '#334155', opacity: 0.4 }}
                          formatter={(value: number) => typeof value === 'number' ? value.toFixed(1) : value}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="value" name="Observed" fill="#6366f1" radius={[4, 4, 0, 0]}>
                          {simState.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                          ))}
                        </Bar>
                        <Bar dataKey="expected" name="Theoretical" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.5} />
                      </BarChart>
                  ) : (
                    <AreaChart data={simState.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                        tickLine={false} 
                        axisLine={false}
                        interval={Math.floor(simState.data.length / 10)}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#818cf8" 
                        fill="#4f46e5" 
                        fillOpacity={0.3} 
                      />
                      {activeSim === 'normal' && (
                        <ReferenceLine x={config.normal.mean} stroke="#ef4444" strokeDasharray="3 3" label="μ" />
                      )}
                      {activeSim === 'clt' && (
                        <ReferenceLine x={50} stroke="#ef4444" strokeDasharray="3 3" label="Expected μ (50)" />
                      )}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart2 className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm">Waiting for simulation data...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
