import { motion } from 'motion/react';

export function CircleTheoremsScene({ progress }: { progress: number }) {
  const isSegment = progress < 50;
  const p = isSegment ? progress * 2 : (progress - 50) * 2;
  
  // Circle Center and Radius
  const CX = 200;
  const CY = 200;
  const R = 150;

  // Points for Segment Theorem
  // Fixed Chord AB
  const angleA = Math.PI * 0.8; // Bottom Leftish
  const angleB = Math.PI * 0.2; // Bottom Rightish
  const Ax = CX + R * Math.cos(angleA);
  const Ay = CY + R * Math.sin(angleA);
  const Bx = CX + R * Math.cos(angleB);
  const By = CY + R * Math.sin(angleB);

  // Moving Point C
  // Oscillates on the major arc
  const t = Math.sin(p * 0.1) * 0.5 + 0.5; // 0 to 1
  const startAngle = Math.PI * 1.2;
  const endAngle = Math.PI * 1.8;
  const angleC = startAngle + (endAngle - startAngle) * t;
  const Cx = CX + R * Math.cos(angleC);
  const Cy = CY + R * Math.sin(angleC);

  // Points for Cyclic Quad
  // Fixed A, B, C, D
  // A, B, C same as above (fixed positions)
  // D moves
  const Dx = CX + R * Math.cos(Math.PI * 1.5);
  const Dy = CY + R * Math.sin(Math.PI * 1.5);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
      <circle cx={CX} cy={CY} r={R} stroke="#475569" strokeWidth="2" fill="none" />
      
      {isSegment ? (
        <>
          {/* Chord AB */}
          <line x1={Ax} y1={Ay} x2={Bx} y2={By} stroke="#fbbf24" strokeWidth="3" />
          
          {/* Triangle ABC */}
          <path d={`M ${Ax} ${Ay} L ${Cx} ${Cy} L ${Bx} ${By}`} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
          
          {/* Angle at C */}
          <text x={Cx} y={Cy - 20} fill="white" textAnchor="middle" fontSize="16">θ</text>
          <text x={CX} y={CY + 100} fill="#94a3b8" textAnchor="middle" fontSize="14">Angle in same segment is constant</text>
        </>
      ) : (
        <>
          {/* Cyclic Quad ABCD */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy}`} fill="rgba(236, 72, 153, 0.2)" stroke="#ec4899" strokeWidth="2" />
          
          {/* Angles */}
          <text x={Ax - 20} y={Ay} fill="white">α</text>
          <text x={Bx + 20} y={By} fill="white">β</text>
          <text x={Cx} y={Cy - 20} fill="white">γ</text>
          <text x={Dx} y={Dy + 20} fill="white">δ</text>
          
          <text x={CX} y={CY + 100} fill="#94a3b8" textAnchor="middle" fontSize="14">α + γ = 180°</text>
        </>
      )}
    </svg>
  );
}
