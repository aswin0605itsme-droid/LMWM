import { motion } from 'motion/react';

export function AngleSumScene({ progress }: { progress: number }) {
  // Triangle Vertices
  const A = { x: 200, y: 100 };
  const B = { x: 50, y: 350 };
  const C = { x: 350, y: 350 };

  // Animation State
  // 0-30: Show Angles
  // 30-70: Move Angles
  // 70-100: Show 180 Line

  const p = Math.min(100, Math.max(0, (progress - 30) * 2.5)); // 0-100 during 30-70
  const t = p / 100;

  // Angle B moves to A
  // Vector B -> A is (A.x - B.x, A.y - B.y)
  const moveB = {
    x: B.x + (A.x - B.x) * t,
    y: B.y + (A.y - B.y) * t,
  };

  // Angle C moves to A
  const moveC = {
    x: C.x + (A.x - C.x) * t,
    y: C.y + (A.y - C.y) * t,
  };

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Parallel Line at Top (Visible at end) */}
      <motion.line 
        x1="0" y1={A.y} x2="400" y2={A.y} 
        stroke="#94a3b8" 
        strokeWidth="2" 
        strokeDasharray="5 5"
        opacity={t}
      />

      {/* Triangle */}
      <path d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`} fill="none" stroke="#475569" strokeWidth="2" />

      {/* Angle A (Top) - Fixed */}
      <path d={`M ${A.x - 30} ${A.y + 50} Q ${A.x} ${A.y + 70} ${A.x + 30} ${A.y + 50} L ${A.x} ${A.y} Z`} fill="#3b82f6" opacity="0.5" />
      <text x={A.x} y={A.y + 40} textAnchor="middle" fill="white" fontSize="12">α</text>

      {/* Angle B (Bottom Left) - Moving */}
      <g transform={`translate(${moveB.x - B.x}, ${moveB.y - B.y})`}>
        <path d={`M ${B.x + 40} ${B.y} Q ${B.x + 30} ${B.y - 30} ${B.x + 15} ${B.y - 45} L ${B.x} ${B.y} Z`} fill="#ec4899" opacity="0.8" />
        <text x={B.x + 25} y={B.y - 15} textAnchor="middle" fill="white" fontSize="12">β</text>
      </g>

      {/* Angle C (Bottom Right) - Moving */}
      <g transform={`translate(${moveC.x - C.x}, ${moveC.y - C.y})`}>
        <path d={`M ${C.x - 40} ${C.y} Q ${C.x - 30} ${C.y - 30} ${C.x - 15} ${C.y - 45} L ${C.x} ${C.y} Z`} fill="#10b981" opacity="0.8" />
        <text x={C.x - 25} y={C.y - 15} textAnchor="middle" fill="white" fontSize="12">γ</text>
      </g>

      {/* Sum Label */}
      <motion.text 
        x={A.x} y={A.y - 20} 
        textAnchor="middle" 
        fill="white" 
        fontSize="16" 
        fontWeight="bold"
        opacity={t > 0.8 ? 1 : 0}
      >
        α + β + γ = 180°
      </motion.text>
    </svg>
  );
}
