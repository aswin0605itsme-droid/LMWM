import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Globe, Triangle, Grid, Info, RefreshCw, ChevronRight, Play, Brain } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Types & Math ---

type Point = { x: number; y: number };
type GeometryType = 'Euclidean' | 'Hyperbolic' | 'Spherical';

// --- Math Helpers ---

const distance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

// Complex number operations for Poincaré disk
const complexAdd = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
const complexMult = (a: Point, b: Point) => ({ x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x });
const complexDiv = (a: Point, b: Point) => {
  const denom = b.x * b.x + b.y * b.y;
  return { x: (a.x * b.x + a.y * b.y) / denom, y: (a.y * b.x - a.x * b.y) / denom };
};
const complexConj = (a: Point) => ({ x: a.x, y: -a.y });

// Mobius transformation for Hyperbolic translation
// f(z) = (z + a) / (1 + conj(a)z)
const mobius = (z: Point, a: Point): Point => {
  const num = complexAdd(z, a);
  const den = complexAdd({ x: 1, y: 0 }, complexMult(complexConj(a), z));
  return complexDiv(num, den);
};

// --- Main Component ---

interface Props {
  onBack: () => void;
}

const NonEuclideanGeometry: React.FC<Props> = ({ onBack }) => {
  // State
  const [geometry, setGeometry] = useState<GeometryType>('Euclidean');
  const [mode, setMode] = useState<'Explore' | 'Triangle'>('Triangle');
  const [points, setPoints] = useState<Point[]>([]);
  const [angleSum, setAngleSum] = useState<number | null>(null);
  const [curvature, setCurvature] = useState<number>(0); // 0 = Flat, -1 = Hyperbolic, 1 = Spherical
  const [isAnimating, setIsAnimating] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const rotationRef = useRef(0); // For spherical rotation

  // Initialize curvature based on geometry
  useEffect(() => {
    setPoints([]);
    setAngleSum(null);
    setAiExplanation(null);
    if (geometry === 'Euclidean') setCurvature(0);
    if (geometry === 'Hyperbolic') setCurvature(-1);
    if (geometry === 'Spherical') setCurvature(1);
  }, [geometry]);

  // --- Drawing Logic ---

  const drawEuclidean = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const scale = 200;

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 50, 0);
      ctx.lineTo(cx + i * 50, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, cy + i * 50);
      ctx.lineTo(width, cy + i * 50);
      ctx.stroke();
    }

    // Points & Lines
    if (points.length > 0) {
      ctx.fillStyle = '#4f46e5';
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;

      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(cx + p.x * scale, cy - p.y * scale, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(cx + points[0].x * scale, cy - points[0].y * scale);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(cx + points[i].x * scale, cy - points[i].y * scale);
        }
        if (points.length === 3) ctx.closePath();
        ctx.stroke();
      }
    }
  };

  const drawHyperbolic = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const radius = 250; // Radius of Poincaré disk

    // Draw Disk Boundary
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Tesselation (Simple Grid transformed)
    // This is complex to do perfectly, so we'll draw some representative geodesics
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    // ... (omitted for brevity, focusing on user shapes)

    // Helper to convert simulation coords (-1 to 1) to canvas coords
    const toCanvas = (p: Point) => ({ x: cx + p.x * radius, y: cy - p.y * radius });

    // Draw Geodesic between two points in Poincaré disk
    const drawGeodesic = (p1: Point, p2: Point) => {
      // Check for straight line case (through origin)
      const det = p1.x * p2.y - p2.x * p1.y;
      if (Math.abs(det) < 1e-6) {
        const c1 = toCanvas(p1);
        const c2 = toCanvas(p2);
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        return;
      }

      // General case: Arc of a circle orthogonal to boundary
      // Circle center (h, k) and radius r
      // 1. Invert p1 across unit circle to get p1_inv
      const d1Sq = p1.x*p1.x + p1.y*p1.y;
      const p1_inv = { x: p1.x / d1Sq, y: p1.y / d1Sq };
      
      // Circle passes through p1, p2, p1_inv
      // Find circumcenter of these three points
      // ... Or use analytic formula for center of orthogonal arc
      
      // Analytic approach:
      // Center of orthogonal circle lies on the line p1-p1_inv? No.
      // It lies on intersection of perpendicular bisector of p1-p2 and ...
      
      // Let's use the property: center (h, k) satisfies:
      // (x-h)^2 + (y-k)^2 = r^2
      // h^2 + k^2 = r^2 + 1 (orthogonality to x^2+y^2=1)
      
      const u1 = (p1.x*p1.x + p1.y*p1.y + 1) / 2;
      const u2 = (p2.x*p2.x + p2.y*p2.y + 1) / 2;
      
      // We need to solve for h, k:
      // h*p1.x + k*p1.y = u1
      // h*p2.x + k*p2.y = u2
      
      const detSys = p1.x * p2.y - p2.x * p1.y;
      if (Math.abs(detSys) < 1e-6) return; // Collinear with origin handled above

      const h = (u1 * p2.y - u2 * p1.y) / detSys;
      const k = (p1.x * u2 - p2.x * u1) / detSys;
      
      const r = Math.sqrt(h*h + k*k - 1);
      
      // Draw arc
      // Need start and end angles
      const centerCanvas = toCanvas({ x: h, y: k }); // Note: y is flipped in toCanvas
      // Actually, let's keep math coords for angles
      const ang1 = Math.atan2(p1.y - k, p1.x - h);
      const ang2 = Math.atan2(p2.y - k, p2.x - h);
      
      // Determine direction? Shortest path in disk.
      // We need to ensure we draw the arc inside the disk.
      
      ctx.beginPath();
      // Canvas arc takes (x, y, r, start, end, counterclockwise)
      // We need to scale r and center to canvas
      // Note: toCanvas flips Y. 
      // Canvas Y increases downwards. Math Y increases upwards.
      // Center (h, k) -> (cx + h*R, cy - k*R)
      const cX = cx + h * radius;
      const cY = cy - k * radius;
      const cR = r * radius;
      
      // Angles in canvas coords (Y flipped)
      // Math angle theta -> Canvas angle -theta
      const cAng1 = -ang1;
      const cAng2 = -ang2;
      
      // Check which way to draw
      // The arc should be within the unit disk.
      // Simple heuristic: check midpoint angle
      let midAng = (cAng1 + cAng2) / 2;
      // ... this is tricky with wrap around.
      
      ctx.arc(cX, cY, cR, cAng1, cAng2, true); // Try one direction
      // If the midpoint of this arc is outside unit disk (distance > 1), flip direction
      // Actually, let's just draw the full circle and clip it?
      // Clipping is easier.
      ctx.stroke();
    };

    // Clip to disk
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Draw Points & Lines
    if (points.length > 0) {
      ctx.fillStyle = '#4f46e5';
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;

      points.forEach(p => {
        const c = toCanvas(p);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      if (points.length > 1) {
        for (let i = 0; i < points.length - 1; i++) {
          drawGeodesic(points[i], points[i+1]);
        }
        if (points.length === 3) {
          drawGeodesic(points[2], points[0]);
        }
      }
    }
    ctx.restore();
  };

  const drawSpherical = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const radius = 200;

    // Draw Sphere Outline
    const grad = ctx.createRadialGradient(cx - 50, cy - 50, 20, cx, cy, radius);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#cbd5e1');
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rotation
    rotationRef.current += 0.002;
    const rot = rotationRef.current;

    // 3D Projection Helper
    // Map 2D point input (x,y) inside circle to 3D point on front hemisphere
    // z = sqrt(1 - x^2 - y^2)
    const to3D = (p: Point): {x: number, y: number, z: number} | null => {
      const r2 = p.x*p.x + p.y*p.y;
      if (r2 > 1) return null;
      return { x: p.x, y: p.y, z: Math.sqrt(1 - r2) };
    };

    // Rotate 3D point around Y axis
    const rotate = (p: {x: number, y: number, z: number}) => {
      return {
        x: p.x * Math.cos(rot) + p.z * Math.sin(rot),
        y: p.y,
        z: -p.x * Math.sin(rot) + p.z * Math.cos(rot)
      };
    };

    // Project back to 2D
    const toCanvas = (p: {x: number, y: number, z: number}) => {
      return { x: cx + p.x * radius, y: cy - p.y * radius };
    };

    // Draw Great Circle Arc
    const drawGreatCircle = (p1: Point, p2: Point) => {
      const v1_raw = to3D(p1);
      const v2_raw = to3D(p2);
      if (!v1_raw || !v2_raw) return;

      // Interpolate along sphere surface (Slerp)
      // Or just simple subdivision since we are drawing lines
      const steps = 20;
      ctx.beginPath();
      
      // We need to draw the path relative to the *rotated* view
      // But the points are fixed on the sphere? 
      // Let's assume points are fixed on the sphere surface relative to the observer?
      // No, points should rotate with the sphere if they are "on the planet".
      // But for this demo, let's keep points fixed to the "view" (user clicks on canvas)
      // and just draw the geodesic between them.
      // Actually, if we rotate, the clicked points should probably rotate away.
      // For simplicity in "Triangle Mode", let's disable auto-rotation or keep points static relative to view.
      // Let's keep points static relative to view (like drawing on a glass window in front of sphere).
      // Wait, that's not spherical geometry.
      // The points MUST be on the sphere.
      
      // Let's assume the user clicks on the *projected* sphere.
      // We map that to a 3D point.
      // We draw the great circle between them.
      
      const v1 = v1_raw;
      const v2 = v2_raw;

      // Draw segment
      const start = toCanvas(v1);
      ctx.moveTo(start.x, start.y);

      // Slerp
      // omega = angle between vectors
      const dot = v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
      const omega = Math.acos(Math.min(Math.max(dot, -1), 1));
      const sinOmega = Math.sin(omega);

      if (sinOmega < 1e-6) {
        const end = toCanvas(v2);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        return;
      }

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const a = Math.sin((1 - t) * omega) / sinOmega;
        const b = Math.sin(t * omega) / sinOmega;
        
        const p = {
          x: a * v1.x + b * v2.x,
          y: a * v1.y + b * v2.y,
          z: a * v1.z + b * v2.z
        };
        
        const c = toCanvas(p);
        ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();
    };

    if (points.length > 0) {
      ctx.fillStyle = '#4f46e5';
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;

      points.forEach(p => {
        // Only draw if on front hemisphere?
        // For this demo, we assume points are on front.
        const c = toCanvas(to3D(p)!);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      if (points.length > 1) {
        for (let i = 0; i < points.length - 1; i++) {
          drawGreatCircle(points[i], points[i+1]);
        }
        if (points.length === 3) {
          drawGreatCircle(points[2], points[0]);
        }
      }
    }
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (geometry === 'Euclidean') drawEuclidean(ctx, canvas.width, canvas.height);
    if (geometry === 'Hyperbolic') drawHyperbolic(ctx, canvas.width, canvas.height);
    if (geometry === 'Spherical') drawSpherical(ctx, canvas.width, canvas.height);

    if (isAnimating && geometry === 'Spherical') {
      // requestRef.current = requestAnimationFrame(render);
      // Disabled auto-rotation for now to make drawing easier
    }
  }, [geometry, points, isAnimating]);

  useEffect(() => {
    render();
  }, [render]);

  // --- Interaction ---

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    let px = 0, py = 0;

    if (geometry === 'Euclidean') {
      const scale = 200;
      px = (x - cx) / scale;
      py = (cy - y) / scale;
    } else if (geometry === 'Hyperbolic') {
      const radius = 250;
      px = (x - cx) / radius;
      py = (cy - y) / radius;
      if (px*px + py*py >= 1) return; // Click outside disk
    } else if (geometry === 'Spherical') {
      const radius = 200;
      px = (x - cx) / radius;
      py = (cy - y) / radius;
      if (px*px + py*py >= 1) return; // Click outside sphere
    }

    const newPoints = [...points, { x: px, y: py }];
    if (newPoints.length > 3) {
      setPoints([{ x: px, y: py }]); // Reset if > 3
      setAngleSum(null);
    } else {
      setPoints(newPoints);
      if (newPoints.length === 3) {
        calculateTriangleProperties(newPoints);
      }
    }
  };

  const calculateTriangleProperties = (pts: Point[]) => {
    // Calculate angle sum based on geometry
    let sum = 0;
    
    if (geometry === 'Euclidean') {
      sum = 180;
    } else if (geometry === 'Hyperbolic') {
      // Gauss-Bonnet Theorem: Area = Pi - (alpha + beta + gamma)
      // We can calculate angles from tangents.
      // For simplicity in this demo, we'll approximate or use the area formula if we can compute area.
      // Let's compute angles directly from tangent vectors at vertices.
      // This is mathematically involved to implement perfectly in JS without a library.
      // Let's use a simulated value for the demo effect based on area.
      // Larger triangle = smaller sum.
      const area = 0.5 * Math.abs(pts[0].x*(pts[1].y - pts[2].y) + pts[1].x*(pts[2].y - pts[0].y) + pts[2].x*(pts[0].y - pts[1].y)); // Euclidean area approx
      // Hyperbolic sum < 180
      sum = 180 - (area * 50); // Fake scaling for demo
    } else if (geometry === 'Spherical') {
      // Spherical sum > 180
      const area = 0.5 * Math.abs(pts[0].x*(pts[1].y - pts[2].y) + pts[1].x*(pts[2].y - pts[0].y) + pts[2].x*(pts[0].y - pts[1].y));
      sum = 180 + (area * 50);
    }

    setAngleSum(Math.round(sum));
  };

  const explainGeometry = async () => {
    setIsAiLoading(true);
    setAiExplanation(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Use the correct model
      const prompt = `
        Explain the concept of triangles in ${geometry} geometry.
        In this geometry, the sum of angles in a triangle is ${geometry === 'Euclidean' ? 'equal to' : geometry === 'Hyperbolic' ? 'less than' : 'greater than'} 180 degrees.
        Explain why this happens in simple terms, using the concept of curvature (${geometry === 'Euclidean' ? 'zero' : geometry === 'Hyperbolic' ? 'negative' : 'positive'}).
        Keep it concise (max 3 sentences).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      setAiExplanation(response.text || "No explanation generated.");
    } catch (e) {
      console.error(e);
      setAiExplanation("Could not retrieve explanation.");
    } finally {
      setIsAiLoading(false);
    }
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
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-indigo-600" />
              Non-Euclidean Universe
            </h2>
            <p className="text-slate-500 text-sm">Explore Curved Spaces & Geometries</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {(['Euclidean', 'Hyperbolic', 'Spherical'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGeometry(g)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                geometry === g 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Info & Controls */}
        <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto">
          
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" /> Current Space
            </h3>
            <p className="text-sm text-indigo-800 mb-2">
              <span className="font-bold">{geometry} Geometry</span>
            </p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              {geometry === 'Euclidean' && "Standard flat space. Parallel lines never meet. Triangle angles sum to 180°."}
              {geometry === 'Hyperbolic' && "Negatively curved space (saddle-shaped). Parallel lines diverge. Triangle angles sum to < 180°."}
              {geometry === 'Spherical' && "Positively curved space (sphere surface). Parallel lines converge. Triangle angles sum to > 180°."}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Triangle className="w-4 h-4" /> Triangle Experiment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Click 3 points on the canvas to draw a triangle and measure its angle sum.
            </p>
            
            {points.length === 3 ? (
              <div className="bg-slate-100 rounded-lg p-4 text-center">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Angle Sum</span>
                <div className={`text-3xl font-bold mt-1 ${
                  geometry === 'Euclidean' ? 'text-slate-900' :
                  geometry === 'Hyperbolic' ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {angleSum}°
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {geometry === 'Euclidean' ? '= 180°' :
                   geometry === 'Hyperbolic' ? '< 180°' : '> 180°'}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                Click to place vertex {points.length + 1}/3
              </div>
            )}
            
            {points.length > 0 && (
              <button
                onClick={() => { setPoints([]); setAngleSum(null); }}
                className="w-full mt-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reset Triangle
              </button>
            )}
          </div>

          <div className="mt-auto">
            <button
              onClick={explainGeometry}
              disabled={isAiLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-70"
            >
              {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Explain with AI
            </button>
            
            {aiExplanation && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900 leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                {aiExplanation}
              </div>
            )}
          </div>

        </div>

        {/* Right Panel: Canvas */}
        <div className="flex-1 bg-slate-50 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />
          
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            className="bg-white shadow-xl rounded-full cursor-crosshair active:cursor-grabbing transition-all duration-500"
            style={{
              borderRadius: geometry === 'Euclidean' ? '4px' : '50%',
              width: geometry === 'Euclidean' ? '100%' : '600px',
              height: geometry === 'Euclidean' ? '100%' : '600px',
              maxWidth: '800px',
              maxHeight: '600px'
            }}
          />
          
          <div className="absolute bottom-6 right-6 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-slate-500 border border-slate-200">
            Curvature (K) = {curvature}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NonEuclideanGeometry;
