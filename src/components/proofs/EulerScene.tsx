import { motion } from 'motion/react';

export function EulerScene({ progress }: { progress: number }) {
  // Cube Vertices
  const size = 100;
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];

  // Rotation
  const angle = progress * 0.05;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Project 3D to 2D
  const project = (v: number[]) => {
    // Rotate Y
    const x1 = v[0] * cos - v[2] * sin;
    const z1 = v[0] * sin + v[2] * cos;
    // Rotate X
    const y2 = v[1] * cos - z1 * sin;
    // const z2 = v[1] * sin + z1 * cos;
    
    return {
      x: 200 + x1 * size,
      y: 200 + y2 * size
    };
  };

  const points = vertices.map(project);

  // Edges
  const edges = [
    [0,1], [1,2], [2,3], [3,0], // Back Face
    [4,5], [5,6], [6,7], [7,4], // Front Face
    [0,4], [1,5], [2,6], [3,7]  // Connecting Edges
  ];

  // Highlight Logic
  // 0-30: Vertices
  // 30-60: Edges
  // 60-90: Faces
  // 90-100: Formula
  
  const showV = progress < 30 || progress > 90;
  const showE = (progress >= 30 && progress < 60) || progress > 90;
  const showF = (progress >= 60 && progress < 90) || progress > 90;

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
      {/* Edges */}
      {edges.map((e, i) => (
        <line 
          key={i}
          x1={points[e[0]].x} y1={points[e[0]].y}
          x2={points[e[1]].x} y2={points[e[1]].y}
          stroke={showE ? "#fbbf24" : "#475569"}
          strokeWidth={showE ? 4 : 2}
          opacity={showE ? 1 : 0.3}
        />
      ))}

      {/* Vertices */}
      {points.map((p, i) => (
        <circle 
          key={i}
          cx={p.x} cy={p.y} r={showV ? 6 : 3}
          fill={showV ? "#3b82f6" : "#475569"}
        />
      ))}

      {/* Formula Display */}
      <g transform="translate(200, 350)">
        <text textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
          {progress < 30 ? "V = 8" : 
           progress < 60 ? "E = 12" : 
           progress < 90 ? "F = 6" : 
           "V - E + F = 2"}
        </text>
        <text y="30" textAnchor="middle" fill="#94a3b8" fontSize="14">
          Euler's Polyhedron Formula
        </text>
      </g>
    </svg>
  );
}
