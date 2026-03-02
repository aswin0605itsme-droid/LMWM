import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ReferenceLine 
} from 'recharts';
import { 
  Brain, Zap, Moon, Activity, AlertTriangle, TrendingUp, 
  Clock, RotateCcw, ChevronRight 
} from 'lucide-react';

interface SimulatorProps {
  onBack: () => void;
}

export default function LifeEquationSimulator({ onBack }: SimulatorProps) {
  // --- State ---
  const [studyHours, setStudyHours] = useState(4);
  const [sleepHours, setSleepHours] = useState(7);
  const [practiceFreq, setPracticeFreq] = useState(3);
  const [isSimulating, setIsSimulating] = useState(false);

  // --- Constants & Math Model ---
  // We simulate 52 weeks (1 year)
  const WEEKS = 52;
  
  const simulationData = useMemo(() => {
    const data = [];
    let skill = 10; // Initial skill level (0-100)
    let burnout = 0; // Initial burnout level (0-100)
    
    // Coefficients
    // Growth Rate (r): Depends on Study Hours & Practice Frequency
    // Base growth from study (diminishing returns after 8 hours)
    const effectiveStudy = studyHours > 10 ? 10 + (studyHours - 10) * 0.2 : studyHours;
    const growthBase = effectiveStudy * 0.05; 
    
    // Practice Multiplier: Consistency is key
    const practiceMultiplier = 1 + (practiceFreq / 7) * 0.5;
    
    // Sleep Efficiency: If sleep < 7, efficiency drops drastically (exponential decay)
    const sleepEfficiency = sleepHours >= 7 ? 1 : Math.pow(sleepHours / 7, 2);
    
    const r = growthBase * practiceMultiplier * sleepEfficiency;

    // Carrying Capacity (K): Max potential skill
    // Limited by sleep (long-term memory consolidation) and burnout
    const maxCapacity = 100 * (sleepHours >= 6 ? 1 : sleepHours / 6);

    // Burnout Accumulation Rate
    // Stress increases if study > 6h or sleep < 7h
    const stress = (Math.max(0, studyHours - 6) * 1.5) + (Math.max(0, 7 - sleepHours) * 2);
    // Recovery depends on sleep and "rest days" (implied by low practice freq)
    const recovery = (Math.max(0, sleepHours - 6) * 2) + ((7 - practiceFreq) * 1.5);

    for (let t = 0; t <= WEEKS; t++) {
      // 1. Calculate Burnout
      // Burnout changes based on Stress - Recovery
      // It has inertia (doesn't change instantly)
      const burnoutDelta = stress - recovery;
      burnout = Math.max(0, Math.min(100, burnout + burnoutDelta));

      // 2. Burnout Drag on Skill
      // High burnout reduces effective growth rate and can even cause regression
      const burnoutFactor = burnout > 50 ? (burnout - 50) / 50 : 0; // 0 to 1
      const effectiveR = r * (1 - burnoutFactor);
      
      // 3. Decay (Forgetting Curve)
      // If practice freq is low, decay increases
      const decayBase = 0.05;
      const decay = decayBase * (1 - practiceFreq / 7);

      // 4. Differential Equation: Logistic Growth with Decay
      // dS/dt = r * S * (1 - S/K) - Decay * S
      const dS = (effectiveR * skill * (1 - skill / maxCapacity)) - (decay * skill);
      
      // Apply change
      skill = Math.max(0, Math.min(100, skill + dS));

      // Add noise/fluctuation for "Real-Life" feel
      // const noise = (Math.random() - 0.5) * 0.5;
      // skill += noise;

      data.push({
        week: t,
        skill: parseFloat(skill.toFixed(1)),
        burnout: parseFloat(burnout.toFixed(1)),
        capacity: parseFloat(maxCapacity.toFixed(1)),
      });
    }
    return data;
  }, [studyHours, sleepHours, practiceFreq]);

  // Derived Metrics
  const finalSkill = simulationData[WEEKS].skill;
  const finalBurnout = simulationData[WEEKS].burnout;
  const maxBurnout = Math.max(...simulationData.map(d => d.burnout));
  const timeToMastery = simulationData.findIndex(d => d.skill >= 90);

  // --- UI Components ---

  const Slider = ({ 
    label, value, onChange, min, max, unit, icon: Icon, color 
  }: { 
    label: string, value: number, onChange: (v: number) => void, min: number, max: number, unit: string, icon: any, color: string 
  }) => (
    <div className="mb-8 group">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
          <div className={`p-2 rounded-lg bg-slate-800 ${color} bg-opacity-10`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
          </div>
          <span className="font-medium text-sm tracking-wide uppercase">{label}</span>
        </div>
        <span className={`font-mono text-xl font-bold ${color.replace('bg-', 'text-')}`}>
          {value} <span className="text-xs text-slate-500 font-normal">{unit}</span>
        </span>
      </div>
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          className={`absolute top-0 left-0 h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${((value - min) / (max - min)) * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full"
      >
        
        {/* --- Header & Controls (Left Panel) --- */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="mb-8">
            <button 
              onClick={onBack}
              className="flex items-center text-slate-500 hover:text-white transition-colors mb-6 text-sm font-medium group"
            >
              <RotateCcw className="w-4 h-4 mr-2 group-hover:-rotate-180 transition-transform duration-500" />
              Return to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Life Equation
              <span className="block text-emerald-400 text-lg font-mono font-normal mt-1">
                Simulator v3.0
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Model your personal growth using differential equations. 
              Adjust your daily habits to see the long-term impact on skill acquisition and burnout probability.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm flex-1 flex flex-col justify-center">
            
            {/* Quick Scenarios */}
            <div className="mb-8">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Quick Scenarios</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Intensive', study: 12, sleep: 5, practice: 7, color: 'hover:bg-red-500/20 hover:border-red-500/50 text-red-400' },
                  { label: 'Low Energy', study: 2, sleep: 9, practice: 1, color: 'hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400' },
                  { label: 'Balanced', study: 6, sleep: 8, practice: 5, color: 'hover:bg-emerald-500/20 hover:border-emerald-500/50 text-emerald-400' },
                ].map((scenario) => (
                  <button
                    key={scenario.label}
                    onClick={() => {
                      setStudyHours(scenario.study);
                      setSleepHours(scenario.sleep);
                      setPracticeFreq(scenario.practice);
                    }}
                    className={`px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/50 text-xs font-medium transition-all duration-200 ${scenario.color}`}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </div>

            <Slider 
              label="Daily Study" 
              value={studyHours} 
              onChange={setStudyHours} 
              min={0} 
              max={16} 
              unit="hrs" 
              icon={Brain}
              color="bg-blue-500"
            />
            <Slider 
              label="Daily Sleep" 
              value={sleepHours} 
              onChange={setSleepHours} 
              min={0} 
              max={12} 
              unit="hrs" 
              icon={Moon}
              color="bg-indigo-500"
            />
            <Slider 
              label="Practice Frequency" 
              value={practiceFreq} 
              onChange={setPracticeFreq} 
              min={0} 
              max={7} 
              unit="days/wk" 
              icon={Zap}
              color="bg-amber-500"
            />

            {/* Live Equation Preview */}
            <div className="mt-8 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-400">
              <div className="flex justify-between items-center mb-2">
                <span className="uppercase tracking-wider text-[10px] text-slate-600">Differential Model</span>
                <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">dS/dt</span>
                  <span>=</span>
                  <span className="text-blue-400">r</span>
                  <span>·</span>
                  <span className="text-white">S</span>
                  <span>·</span>
                  <span>(1 - S/K)</span>
                  <span>-</span>
                  <span className="text-red-400">Decay</span>
                </div>
                <div className="h-px bg-slate-800 my-2" />
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>r (Growth): <span className="text-blue-400">{(studyHours * 0.05 * (1 + practiceFreq/7)).toFixed(3)}</span></div>
                  <div>K (Capacity): <span className="text-indigo-400">{(100 * (sleepHours >= 6 ? 1 : sleepHours/6)).toFixed(0)}%</span></div>
                  <div>Decay: <span className="text-red-400">{(0.05 * (1 - practiceFreq/7)).toFixed(3)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Visualization (Right Panel) --- */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Chart */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden min-h-[400px]">
            <div className="absolute top-0 right-0 p-6 flex gap-4">
              <div className="flex items-center gap-2 text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-100">Skill Level</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-100">Burnout Risk</span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Growth Projection (52 Weeks)
            </h3>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSkill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBurnout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    stroke="#475569" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis 
                    stroke="#475569" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="skill" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorSkill)" 
                    animationDuration={1000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="burnout" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorBurnout)" 
                    animationDuration={1000}
                  />
                  {/* Reference Line for "Mastery" */}
                  <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: "Mastery", position: 'insideTopRight', fill: '#3b82f6', fontSize: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Projected Skill</span>
                <Brain className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <span className="text-3xl font-bold text-white">{finalSkill.toFixed(0)}%</span>
                <div className="mt-1 text-xs text-slate-500">
                  {finalSkill > 80 ? "Expert Level" : finalSkill > 50 ? "Intermediate" : "Beginner"}
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${finalSkill}%` }} />
              </div>
            </motion.div>

            <motion.div 
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Burnout Risk</span>
                <AlertTriangle className={`w-5 h-5 ${finalBurnout > 70 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
              </div>
              <div>
                <span className={`text-3xl font-bold ${finalBurnout > 70 ? 'text-red-500' : 'text-white'}`}>
                  {finalBurnout.toFixed(0)}%
                </span>
                <div className="mt-1 text-xs text-slate-500">
                  Peak: {maxBurnout.toFixed(0)}% during cycle
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${finalBurnout > 70 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${finalBurnout}%` }} />
              </div>
            </motion.div>

            <motion.div 
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Time to Mastery</span>
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <span className="text-3xl font-bold text-white">
                  {timeToMastery !== -1 ? `${timeToMastery} wks` : "∞"}
                </span>
                <div className="mt-1 text-xs text-slate-500">
                  To reach 90% proficiency
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1">
                {timeToMastery !== -1 ? (
                  <span className="text-xs text-emerald-400 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" /> Achievable
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Optimize habits</span>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
