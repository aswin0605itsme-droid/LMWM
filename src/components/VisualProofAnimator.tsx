import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, ChevronLeft, Film } from 'lucide-react';
import { PythagorasScene } from './proofs/PythagorasScene';
import { ThalesScene } from './proofs/ThalesScene';
import { AngleSumScene } from './proofs/AngleSumScene';
import { CircleTheoremsScene } from './proofs/CircleTheoremsScene';
import { ArithmeticScene } from './proofs/ArithmeticScene';
import { EuclidScene } from './proofs/EuclidScene';
import { EulerScene } from './proofs/EulerScene';

interface ProofAnimatorProps {
  onBack: () => void;
}

type SceneType = 'pythagoras' | 'thales' | 'anglesum' | 'circle' | 'arithmetic' | 'euclid' | 'euler';

const SCENES: { id: SceneType; label: string; title: string }[] = [
  { id: 'pythagoras', label: 'Pythagoras', title: 'Pythagorean Theorem' },
  { id: 'thales', label: 'Thales', title: "Thales's Theorem" },
  { id: 'anglesum', label: 'Angle Sum', title: 'Sum of Angles' },
  { id: 'circle', label: 'Circle', title: 'Circle Theorems' },
  { id: 'arithmetic', label: 'Arithmetic', title: 'Fundamental Thm of Arithmetic' },
  { id: 'euclid', label: 'Euclid', title: "Euclid's Theorem" },
  { id: 'euler', label: 'Euler', title: "Euler's Formula" },
];

export default function VisualProofAnimator({ onBack }: ProofAnimatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeScene, setActiveScene] = useState<SceneType>('pythagoras');
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Animation Constants
  const DURATION = 10000; // 10 seconds for full loop

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time - (progress / 100 * DURATION);
    const deltaTime = time - startTimeRef.current;
    
    if (deltaTime >= DURATION) {
      setProgress(100);
      setIsPlaying(false);
      startTimeRef.current = undefined;
      return;
    }

    const newProgress = (deltaTime / DURATION) * 100;
    setProgress(newProgress);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      startTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(Number(e.target.value));
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (progress >= 100) {
      setProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const switchScene = (scene: SceneType) => {
    setActiveScene(scene);
    reset();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-slate-800 flex flex-col gap-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-500" />
                Visual Proof Animator
              </h1>
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                Module 04 • Cinematic Logic
              </p>
            </div>
          </div>
        </div>
        
        {/* Scrollable Scene Selector */}
        <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar mask-gradient">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              onClick={() => switchScene(scene.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                activeScene === scene.id 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {scene.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Canvas Container */}
        <div className="flex-1 bg-black relative flex items-center justify-center p-8 lg:p-16 overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ 
                 backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
                 backgroundSize: '40px 40px' 
               }} 
          />
          
          <div className="relative z-0 w-full max-w-2xl aspect-square">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {activeScene === 'pythagoras' && <PythagorasScene progress={progress} />}
                {activeScene === 'thales' && <ThalesScene progress={progress} />}
                {activeScene === 'anglesum' && <AngleSumScene progress={progress} />}
                {activeScene === 'circle' && <CircleTheoremsScene progress={progress} />}
                {activeScene === 'arithmetic' && <ArithmeticScene progress={progress} />}
                {activeScene === 'euclid' && <EuclidScene progress={progress} />}
                {activeScene === 'euler' && <EulerScene progress={progress} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Overlay Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl z-20">
            <div className="flex items-center gap-4 mb-2">
              <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
              
              <button 
                onClick={reset}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              <span>00:00</span>
              <span>{(progress / 10).toFixed(1)}s / 10.0s</span>
            </div>
          </div>
        </div>

        {/* Narrative Sidebar */}
        <div className="w-full lg:w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col z-10">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              Theorem
            </h3>
            <h2 className="text-xl font-bold text-white mb-6 leading-tight">
              {SCENES.find(s => s.id === activeScene)?.title}
            </h2>
            
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Narrative Track
            </h3>
            <Narrative activeScene={activeScene} progress={progress} />
          </div>
          
          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="text-xs text-slate-500 font-mono">
              Render Engine: SVG/Motion<br/>
              Frame Rate: 60fps<br/>
              Precision: Float32
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Narrative({ activeScene, progress }: { activeScene: string, progress: number }) {
  const stepsMap: Record<string, { t: number; text: string }[]> = {
    pythagoras: [
      { t: 0, text: "Consider a square with side length (a + b). Inside, we form a tilted square with side 'c'." },
      { t: 20, text: "The area of the inner square is exactly c². The four yellow triangles are identical." },
      { t: 40, text: "Let's rearrange the triangles. Watch how the total area remains unchanged." },
      { t: 60, text: "By moving the triangles, we reveal two new squares: a² and b²." },
      { t: 80, text: "Since the empty space changed shape but not area, c² must equal a² + b²." },
    ],
    thales: [
      { t: 0, text: "Consider triangle ABC with a line DE parallel to the base BC." },
      { t: 20, text: "As we move the line DE, the segments AD, DB, AE, and EC change length." },
      { t: 40, text: "However, notice the relationship between the ratios on each side." },
      { t: 60, text: "The ratio AD/DB is always equal to the ratio AE/EC." },
      { t: 80, text: "This is Thales's Basic Proportionality Theorem: Parallel lines divide sides proportionally." },
    ],
    anglesum: [
      { t: 0, text: "Every triangle has three interior angles: α, β, and γ." },
      { t: 30, text: "Let's construct a line parallel to the base through the top vertex." },
      { t: 50, text: "By translating the bottom angles, we can see they fit perfectly on this line." },
      { t: 70, text: "The three angles together form a straight line, which is 180°." },
      { t: 90, text: "Therefore, the sum of angles in any triangle is always 180°." },
    ],
    circle: [
      { t: 0, text: "Theorem 1: Angles subtended by the same arc at the circumference are equal." },
      { t: 30, text: "Move point C along the major arc. Notice that angle θ remains constant." },
      { t: 50, text: "Theorem 2: Cyclic Quadrilaterals (all vertices on a circle)." },
      { t: 70, text: "Opposite angles in a cyclic quadrilateral sum to 180°." },
      { t: 90, text: "Here, α + γ = 180°. This property is fundamental to circle geometry." },
    ],
    arithmetic: [
      { t: 0, text: "The Fundamental Theorem of Arithmetic states every integer > 1 is unique." },
      { t: 30, text: "Take the number 30. We can split it into factors, like 2 × 15." },
      { t: 50, text: "We can continue splitting the composite factors. 15 becomes 3 × 5." },
      { t: 70, text: "We are left with prime numbers: 2, 3, and 5." },
      { t: 90, text: "This set of primes is unique to 30. No other combination multiplies to 30." },
    ],
    euclid: [
      { t: 0, text: "Euclid proved there are infinitely many prime numbers by contradiction." },
      { t: 20, text: "Assume there is a finite list of primes. Let's multiply them all to get N." },
      { t: 40, text: "Now add 1 to get Q = N + 1." },
      { t: 60, text: "If we divide Q by any of our primes, the remainder is always 1." },
      { t: 80, text: "Thus Q is either a new prime itself, or has a prime factor not in our list." },
    ],
    euler: [
      { t: 0, text: "Euler's Formula relates the features of any convex polyhedron." },
      { t: 30, text: "Count the Vertices (corners). For a cube, V = 8." },
      { t: 50, text: "Count the Edges (lines). For a cube, E = 12." },
      { t: 70, text: "Count the Faces (flat surfaces). For a cube, F = 6." },
      { t: 90, text: "Euler discovered that V - E + F always equals 2." },
    ],
  };

  const steps = stepsMap[activeScene] || stepsMap['pythagoras'];
  const currentStep = steps.slice().reverse().find(s => progress >= s.t) || steps[0];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0"
          >
            <p className="text-lg font-light leading-relaxed text-slate-200">
              {currentStep.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Timeline Visualization */}
      <div className="mt-8 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
        {steps.map((step, i) => (
          <div 
            key={i} 
            className={`flex items-start gap-4 text-xs transition-colors ${
              progress >= step.t ? 'text-blue-400' : 'text-slate-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
              progress >= step.t ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800'
            }`} />
            <div className="flex flex-col gap-1">
              <span className="font-mono opacity-50">{(step.t / 10).toFixed(1)}s</span>
              <span className="line-clamp-2">{step.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
