import { motion } from 'motion/react';

export function ThalesScene({ progress }: { progress: number }) {
  // Triangle Vertices
  const A = { x: 200, y: 50 };
  const B = { x: 50, y: 350 };
  const C = { x: 350, y: 350 };

  // Interpolation factor (oscillates)
  // 0 to 1
  const t = 0.3 + 0.4 * Math.sin(progress * 0.1); 

  // Points D and E
  const D = {
    x: A.x + (B.x - A.x) * t,
    y: A.y + (B.y - A.y) * t,
  };
  const E = {
    x: A.x + (C.x - A.x) * t,
    y: A.y + (C.y - A.y) * t,
  };

  // Ratios
  const ratio = (t / (1 - t)).toFixed(2);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800 font-mono">
      <defs>
        <linearGradient id="triGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Main Triangle */}
      <path 
        d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`} 
        fill="url(#triGrad)" 
        stroke="#334155" 
        strokeWidth="2" 
      />

      {/* Segments AD, DB, AE, EC */}
      {/* AD */}
      <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke="#3b82f6" strokeWidth="4" />
      {/* DB */}
      <line x1={D.x} y1={D.y} x2={B.x} y2={B.y} stroke="#1d4ed8" strokeWidth="4" strokeDasharray="4 4" />
      
      {/* AE */}
      <line x1={A.x} y1={A.y} x2={E.x} y2={E.y} stroke="#ec4899" strokeWidth="4" />
      {/* EC */}
      <line x1={E.x} y1={E.y} x2={C.x} y2={C.y} stroke="#be185d" strokeWidth="4" strokeDasharray="4 4" />

      {/* Parallel Line DE */}
      <line x1={D.x} y1={D.y} x2={E.x} y2={E.y} stroke="#fbbf24" strokeWidth="3" filter="url(#glow)" />
      
      {/* Base Line BC */}
      <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="#fbbf24" strokeWidth="3" opacity="0.5" />

      {/* Labels */}
      <text x={A.x} y={A.y - 15} fill="white" textAnchor="middle">A</text>
      <text x={B.x - 15} y={B.y} fill="white" textAnchor="middle">B</text>
      <text x={C.x + 15} y={C.y} fill="white" textAnchor="middle">C</text>
      <text x={D.x - 15} y={D.y} fill="#fbbf24" textAnchor="middle">D</text>
      <text x={E.x + 15} y={E.y} fill="#fbbf24" textAnchor="middle">E</text>

      {/* Ratio Display */}
      <g transform="translate(20, 20)">
        <rect width="140" height="70" rx="8" fill="rgba(0,0,0,0.6)" stroke="#475569" />
        <text x="70" y="25" fill="#3b82f6" textAnchor="middle" fontSize="12">AD / DB = {ratio}</text>
        <text x="70" y="50" fill="#ec4899" textAnchor="middle" fontSize="12">AE / EC = {ratio}</text>
      </g>
    </svg>
  );
}
