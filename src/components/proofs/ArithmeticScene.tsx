import { motion } from 'motion/react';

export function ArithmeticScene({ progress }: { progress: number }) {
  // Number 30
  // Factors: 2, 3, 5
  
  // Phase 1: Show 30 as a single block (or grid 5x6)
  // Phase 2: Split into 2 groups of 15 (3x5)
  // Phase 3: Split each 15 into 3 groups of 5 (1x5)
  
  // Progress 0-30: Phase 1 -> 2
  // Progress 30-60: Phase 2 -> 3
  // Progress 60-100: Show Primes

  const p1 = Math.min(1, Math.max(0, (progress) / 30));
  const p2 = Math.min(1, Math.max(0, (progress - 30) / 30));
  
  // Grid Configuration
  // Initial: 6 rows, 5 cols.
  // Split 1: 2 groups of (3 rows, 5 cols). Gap in middle (vertical split? or horizontal?)
  // Let's split horizontally. Top 3 rows, Bottom 3 rows.
  
  // Split 2: Each group of 3 rows splits into 3 groups of 1 row.
  
  const gap1 = p1 * 40; // Gap between 2 groups
  const gap2 = p2 * 20; // Gap between 3 subgroups
  
  const blocks = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      // Determine group (0 or 1)
      const group1 = r < 3 ? 0 : 1;
      // Determine subgroup (0, 1, 2 within group)
      const subgroup = r % 3;
      
      const x = c * 30 + 100;
      const y = r * 30 + 50 + (group1 * gap1) + (subgroup * gap2);
      
      blocks.push(
        <motion.rect
          key={`${r}-${c}`}
          x={x}
          y={y}
          width={25}
          height={25}
          fill={group1 === 0 ? "#3b82f6" : "#ec4899"}
          rx="4"
        />
      );
    }
  }

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
      {blocks}
      
      <text x="200" y="350" fill="white" textAnchor="middle" fontSize="20">
        {progress < 30 ? "30" : progress < 60 ? "2 × 15" : "2 × 3 × 5"}
      </text>
      
      <text x="200" y="380" fill="#94a3b8" textAnchor="middle" fontSize="14">
        Unique Prime Factorization
      </text>
    </svg>
  );
}
