import { motion } from 'motion/react';

export function PythagorasScene({ progress }: { progress: number }) {
  // Dimensions
  const SIZE = 400;
  const A = 120; // Short side
  const B = 280; // Long side
  // C is hypotenuse of A and B
  
  // Animation Phases
  // 0-20: Static C^2
  // 20-60: Transition
  // 60-100: Static A^2 + B^2
  
  const p = Math.min(100, Math.max(0, (progress - 20) * 2.5)); // Normalize 20-60 to 0-100
  
  const ease = (t: number) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease in out
  const t = ease(p / 100);

  // Triangle Path String (Right Triangle, legs A and B)
  // Origin at top-left right angle.
  // Points: (0,0), (A,0), (0,B).
  const pathData = `M 0 0 L ${A} 0 L 0 ${B} Z`;

  // State 1 Props (C^2 Center)
  const s1_t1 = { x: 0, y: 0, r: 0 };
  const s1_t2 = { x: 400, y: 0, r: 90 };
  const s1_t3 = { x: 400, y: 400, r: 180 };
  const s1_t4 = { x: 0, y: 400, r: 270 };

  // State 2 Props (Rectangles)
  // Rect 1 (Top-Right): T1(Fixed?), T2(Moved)
  // Rect 2 (Bottom-Left): T3(Moved), T4(Fixed?)
  
  const interpolate = (start: any, end: any) => ({
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    r: start.r + (end.r - start.r) * t,
  });

  const t1 = s1_t1; // Static
  const t2 = interpolate(s1_t2, { x: A, y: B, r: 180 }); // Moves to form rectangle with T1
  const t3 = s1_t3; // Static
  const t4 = interpolate(s1_t4, { x: B+A, y: A, r: 0 }); // Moves to form rectangle with T3? 

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#be185d', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#047857', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Background Areas (The "Holes") */}
      <motion.rect 
        x={A} y={0} width={B} height={B} 
        fill="url(#grad1)" 
        opacity={Math.max(0, (progress - 60) / 20)} 
      />
      <motion.text x={A + B/2} y={B/2} textAnchor="middle" fill="white" fontSize="40" fontWeight="bold" opacity={Math.max(0, (progress - 60) / 20)}>b²</motion.text>
      
      <motion.rect 
        x={0} y={B} width={A} height={A} 
        fill="url(#grad2)" 
        opacity={Math.max(0, (progress - 60) / 20)} 
      />
      <motion.text x={A/2} y={B + A/2} textAnchor="middle" fill="white" fontSize="30" fontWeight="bold" opacity={Math.max(0, (progress - 60) / 20)}>a²</motion.text>

      {/* C^2 Hole (Visible initially) */}
      <motion.rect 
        x="0" y="0" width={Math.sqrt(A*A + B*B)} height={Math.sqrt(A*A + B*B)}
        fill="url(#grad3)"
        opacity={Math.max(0, 1 - (progress - 10) / 20)}
        transform={`translate(${A}, 0) rotate(${Math.atan2(A, B) * 180 / Math.PI})`}
      />
      {/* Center Label for C^2 */}
      <motion.text 
        x="200" y="200" 
        textAnchor="middle" 
        fill="white" 
        fontSize="50" 
        fontWeight="bold"
        opacity={Math.max(0, 1 - (progress - 10) / 20)}
        filter="url(#glow)"
      >
        c²
      </motion.text>

      {/* Triangles */}
      <g transform={`translate(${t1.x}, ${t1.y}) rotate(${t1.r})`}>
        <path d={pathData} fill="#fbbf24" stroke="#slate-900" strokeWidth="2" />
      </g>
      <g transform={`translate(${t2.x}, ${t2.y}) rotate(${t2.r})`}>
        <path d={pathData} fill="#fbbf24" stroke="#slate-900" strokeWidth="2" />
      </g>
      <g transform={`translate(${t3.x}, ${t3.y}) rotate(${t3.r})`}>
        <path d={pathData} fill="#fbbf24" stroke="#slate-900" strokeWidth="2" />
      </g>
      <g transform={`translate(${t4.x}, ${t4.y}) rotate(${t4.r})`}>
        <path d={pathData} fill="#fbbf24" stroke="#slate-900" strokeWidth="2" />
      </g>
    </svg>
  );
}
