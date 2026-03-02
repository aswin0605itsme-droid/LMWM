import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { compile } from 'mathjs';
import { ArrowLeft, RefreshCw, Info, Layers, Move, Calculator, Maximize, Grid } from 'lucide-react';

interface ThreeDGraphVisualizerProps {
  onBack: () => void;
}

// --- Helper Components ---

const Axes = ({ size = 10 }) => {
  return (
    <group>
      {/* X Axis - Red */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), size, 0xff0000]} />
      <Text position={[size + 0.5, 0, 0]} fontSize={0.5} color="red">X</Text>
      
      {/* Y Axis - Green (Math Z - Height) */}
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), size, 0x00ff00]} />
      <Text position={[0, size + 0.5, 0]} fontSize={0.5} color="green">Z</Text>
      
      {/* Z Axis - Blue (Math Y - Depth) */}
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), size, 0x0000ff]} />
      <Text position={[0, 0, size + 0.5]} fontSize={0.5} color="blue">Y</Text>
      
      <gridHelper args={[size * 2, size * 2, 0x444444, 0x222222]} />
    </group>
  );
};

// --- 3D Surface Component ---

const GraphSurface = ({ 
  expression, 
  xRange, 
  yRange, 
  resolution, 
  showWireframe, 
  colorMap,
  transform,
  crossSection
}: { 
  expression: string, 
  xRange: [number, number], 
  yRange: [number, number], 
  resolution: number,
  showWireframe: boolean,
  colorMap: string,
  transform: { scale: [number, number, number], rotation: [number, number, number], position: [number, number, number] },
  crossSection: { enabled: boolean, axis: 'x' | 'y' | 'z', value: number }
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const { geometry, colors } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const colorsArr = [];
    const indices = [];
    
    let compiledExpr;
    try {
      compiledExpr = compile(expression);
    } catch (e) {
      return { geometry: null, colors: null };
    }

    const xStep = (xRange[1] - xRange[0]) / resolution;
    const yStep = (yRange[1] - yRange[0]) / resolution;

    let minZ = Infinity;
    let maxZ = -Infinity;
    const zValues = [];

    // First pass: calculate Z values
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = xRange[0] + i * xStep;
        const y = yRange[0] + j * yStep;
        let z = 0;
        try {
          z = compiledExpr.evaluate({ x, y });
          if (!isFinite(z) || isNaN(z)) z = 0;
        } catch (e) {
          z = 0;
        }
        zValues.push(z);
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }
    
    const zRange = maxZ - minZ || 1;
    let idx = 0;

    // Second pass: generate vertices
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = xRange[0] + i * xStep;
        const y = yRange[0] + j * yStep;
        const z = zValues[idx++];

        // Mapping: Math X -> Three X, Math Y -> Three Z, Math Z -> Three Y
        vertices.push(x, z, y); 

        const t = (z - minZ) / zRange;
        const color = new THREE.Color();
        
        if (colorMap === 'cool') color.setHSL(0.6 + t * 0.4, 1, 0.5);
        else if (colorMap === 'hot') color.setHSL(0.1 + t * 0.1, 1, 0.5);
        else if (colorMap === 'rainbow') color.setHSL((1 - t) * 0.7, 1, 0.5);
        else color.setHSL(0.6, 1, 0.5 + t * 0.4);
        
        colorsArr.push(color.r, color.g, color.b);
      }
    }

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + j;
        const b = i * (resolution + 1) + j + 1;
        const c = (i + 1) * (resolution + 1) + j;
        const d = (i + 1) * (resolution + 1) + j + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colorsArr, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    
    return { geometry: geom, colors: colorsArr };
  }, [expression, xRange, yRange, resolution, colorMap]);

  if (!geometry) return null;

  // Cross-section clipping logic
  const clippingPlanes = useMemo(() => {
    if (!crossSection.enabled) return [];
    
    const normal = new THREE.Vector3();
    // Remember mapping: X->X, Y->Z, Z->Y
    if (crossSection.axis === 'x') normal.set(-1, 0, 0); // Clip X > value
    if (crossSection.axis === 'y') normal.set(0, 0, -1); // Clip Y > value (Three Z)
    if (crossSection.axis === 'z') normal.set(0, -1, 0); // Clip Z > value (Three Y)
    
    // Constant needs to be adjusted based on the transform? 
    // For simplicity, we clip in local space or world space. 
    // Let's do local space clipping which is easier with material.clippingPlanes
    
    // However, THREE.Plane constant is distance from origin.
    // Plane equation: Ax + By + Cz + D = 0
    // If we want to cut at x = 5, normal (-1, 0, 0), then -1*5 + D = 0 => D = 5.
    
    return [new THREE.Plane(normal, crossSection.value)];
  }, [crossSection]);

  return (
    <group 
      position={new THREE.Vector3(...transform.position)}
      rotation={new THREE.Euler(...transform.rotation.map(d => d * Math.PI / 180))}
      scale={new THREE.Vector3(...transform.scale)}
    >
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
          vertexColors 
          side={THREE.DoubleSide} 
          wireframe={showWireframe}
          roughness={0.3}
          metalness={0.1}
          clippingPlanes={clippingPlanes}
          clipShadows
        />
      </mesh>
      {showWireframe && (
         <mesh geometry={geometry}>
           <meshBasicMaterial 
             color="#000" 
             wireframe 
             opacity={0.1} 
             transparent 
             clippingPlanes={clippingPlanes}
            />
         </mesh>
      )}
      
      {/* Visual Plane for Cross Section */}
      {crossSection.enabled && (
        <mesh position={[
          crossSection.axis === 'x' ? crossSection.value : 0,
          crossSection.axis === 'z' ? crossSection.value : 0, // Math Z is Three Y
          crossSection.axis === 'y' ? crossSection.value : 0  // Math Y is Three Z
        ]}
        rotation={[
          crossSection.axis === 'z' ? Math.PI / 2 : 0,
          crossSection.axis === 'x' ? 0 : crossSection.axis === 'y' ? 0 : 0, // Y axis plane needs to be vertical
          crossSection.axis === 'y' ? 0 : 0
        ]}
        >
          {/* We need to orient the plane correctly. 
              PlaneGeometry is in XY plane by default.
              If Axis X: Plane should be YZ (Rotate Y 90)
              If Axis Y: Plane should be XZ (Rotate X 90? No, Math Y is Three Z. So Plane XY is Three XZ? No.)
              
              Let's simplify:
              Three Y is Up (Math Z).
              Three Z is Depth (Math Y).
              Three X is Width (Math X).
              
              Cut X: Plane parallel to YZ (Three Y-Z). Rotate Y 90.
              Cut Y (Three Z): Plane parallel to XY (Three X-Y). Rotate nothing? No, Plane is XY.
              Cut Z (Three Y): Plane parallel to XZ (Three X-Z). Rotate X 90.
          */}
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial 
            color="white" 
            opacity={0.1} 
            transparent 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

// --- 2D Graph Component ---

const Graph2D = ({ expression, xRange, resolution, color }: any) => {
  const points = useMemo(() => {
    const pts = [];
    let compiledExpr;
    try {
      compiledExpr = compile(expression);
    } catch (e) {
      return [];
    }

    const step = (xRange[1] - xRange[0]) / (resolution * 2); // Higher res for 2D
    for (let x = xRange[0]; x <= xRange[1]; x += step) {
      try {
        const y = compiledExpr.evaluate({ x }); // Evaluate y = f(x)
        if (isFinite(y) && !isNaN(y)) {
          // Map to 3D space: x -> x, y -> y (Three Y), z -> 0
          pts.push(new THREE.Vector3(x, y, 0));
        }
      } catch (e) {}
    }
    return pts;
  }, [expression, xRange, resolution]);

  if (points.length === 0) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
};

// --- Derivative Visualizer ---

const DerivativeVisualizer = ({ expression, point, enabled }: { expression: string, point: {x: number, y: number}, enabled: boolean }) => {
  if (!enabled) return null;

  const data = useMemo(() => {
    try {
      const compiled = compile(expression);
      const h = 0.01;
      const { x, y } = point;
      
      const z = compiled.evaluate({ x, y });
      const z_x = compiled.evaluate({ x: x + h, y });
      const z_y = compiled.evaluate({ x, y: y + h });
      const z_x_prev = compiled.evaluate({ x: x - h, y });
      const z_y_prev = compiled.evaluate({ x, y: y - h });
      
      const dz_dx = (z_x - z_x_prev) / (2 * h);
      const dz_dy = (z_y - z_y_prev) / (2 * h);
      
      // Normal vector (-dz/dx, -dz/dy, 1) normalized
      const normal = new THREE.Vector3(-dz_dx, 1, -dz_dy).normalize(); // Note: Y is up in ThreeJS, so (x, z, y) mapping applies
      // Wait, mapping is: Math X -> Three X, Math Z -> Three Y, Math Y -> Three Z
      // Surface: P(x, y) = (x, f(x,y), y) in Three coords
      // Tangent vectors:
      // Tx = (1, dz/dx, 0)
      // Ty = (0, dz/dy, 1)
      // Normal = Tx cross Ty = (dz/dx, -1, dz/dy) or (-dz/dx, 1, -dz/dy) depending on order
      
      const threeNormal = new THREE.Vector3(-dz_dx, 1, -dz_dy).normalize();
      
      return { z, dz_dx, dz_dy, threeNormal };
    } catch (e) {
      return null;
    }
  }, [expression, point]);

  if (!data) return null;

  return (
    <group position={[point.x, data.z, point.y]}>
      {/* Point Marker */}
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="yellow" emissive="orange" />
      </mesh>
      
      {/* Tangent Plane */}
      <mesh quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), data.threeNormal)}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="white" opacity={0.3} transparent side={THREE.DoubleSide} />
      </mesh>
      
      {/* Normal Vector */}
      <arrowHelper args={[data.threeNormal, new THREE.Vector3(0,0,0), 2, 0xffff00]} />
      
      {/* Label */}
      <Html position={[0, 1, 0]}>
        <div className="bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap pointer-events-none">
          <div>z = {data.z.toFixed(2)}</div>
          <div>∂z/∂x = {data.dz_dx.toFixed(2)}</div>
          <div>∂z/∂y = {data.dz_dy.toFixed(2)}</div>
        </div>
      </Html>
    </group>
  );
};


// --- Main Component ---

export default function ThreeDGraphVisualizer({ onBack }: ThreeDGraphVisualizerProps) {
  const [expression, setExpression] = useState('sin(sqrt(x^2 + y^2))');
  const [tempExpression, setTempExpression] = useState('sin(sqrt(x^2 + y^2))');
  const [resolution, setResolution] = useState(50);
  const [xRange, setXRange] = useState<[number, number]>([-10, 10]);
  const [yRange, setYRange] = useState<[number, number]>([-10, 10]);
  const [showWireframe, setShowWireframe] = useState(false);
  const [colorMap, setColorMap] = useState('rainbow');
  const [autoRotate, setAutoRotate] = useState(false);
  
  // New States
  const [mode, setMode] = useState<'3D' | '2D'>('3D');
  const [activeTab, setActiveTab] = useState<'plot' | 'transform' | 'analysis'>('plot');
  
  const [transform, setTransform] = useState({
    scale: [1, 1, 1] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    position: [0, 0, 0] as [number, number, number]
  });

  const [crossSection, setCrossSection] = useState({
    enabled: false,
    axis: 'x' as 'x' | 'y' | 'z',
    value: 0
  });

  const [derivative, setDerivative] = useState({
    enabled: false,
    x: 0,
    y: 0
  });

  const handleUpdate = () => {
    setExpression(tempExpression);
  };

  const presets = [
    { name: 'Ripple', expr: 'sin(sqrt(x^2 + y^2))' },
    { name: 'Peaks', expr: 'sin(x) * cos(y)' },
    { name: 'Saddle', expr: 'x^2 - y^2' },
    { name: 'Pyramid', expr: '1 - abs(x + y) - abs(y - x)' },
    { name: 'Noise', expr: 'sin(x*y/5)' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar Controls */}
      <div className="w-full md:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-[40vh] md:h-screen z-10 shadow-xl">
        <div className="p-6 pb-2">
          <div className="flex items-center mb-6">
            <button 
              onClick={onBack}
              className="p-2 mr-3 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              Graph Visualizer
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-lg p-1 mb-4">
            {[
              { id: 'plot', icon: Layers, label: 'Plot' },
              { id: 'transform', icon: Move, label: 'Transform' },
              { id: 'analysis', icon: Calculator, label: 'Analysis' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-cyan-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          
          {/* PLOT TAB */}
          {activeTab === 'plot' && (
            <div className="space-y-6">
              {/* Mode Selector */}
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setMode('3D')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${mode === '3D' ? 'bg-slate-700 text-cyan-400' : 'text-slate-500'}`}
                >
                  3D Surface
                </button>
                <button
                  onClick={() => setMode('2D')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${mode === '2D' ? 'bg-slate-700 text-cyan-400' : 'text-slate-500'}`}
                >
                  2D Curve
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {mode === '3D' ? 'Function z = f(x, y)' : 'Function y = f(x)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempExpression}
                    onChange={(e) => setTempExpression(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                  />
                  <button 
                    onClick={handleUpdate}
                    className="absolute right-2 top-2 p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {mode === '3D' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setTempExpression(preset.expr);
                          setExpression(preset.expr);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-slate-300 transition-colors text-left"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Range (±)</label>
                    <span className="text-xs text-slate-500">{xRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="1"
                    value={xRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setXRange([-val, val]);
                      setYRange([-val, val]);
                    }}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Resolution</label>
                    <span className="text-xs text-slate-500">{resolution}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={resolution}
                    onChange={(e) => setResolution(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              {mode === '3D' && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Wireframe</span>
                    <button
                      onClick={() => setShowWireframe(!showWireframe)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${showWireframe ? 'bg-cyan-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showWireframe ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <span className="text-xs text-slate-400">Color Map</span>
                    <div className="flex gap-2">
                      {['rainbow', 'cool', 'hot', 'blue'].map((map) => (
                        <button
                          key={map}
                          onClick={() => setColorMap(map)}
                          className={`w-8 h-8 rounded-full border-2 ${colorMap === map ? 'border-white' : 'border-transparent'} hover:scale-110 transition-transform`}
                          style={{
                            background: map === 'rainbow' ? 'linear-gradient(to right, red, orange, yellow, green, blue, violet)' :
                                       map === 'cool' ? 'linear-gradient(to right, blue, purple)' :
                                       map === 'hot' ? 'linear-gradient(to right, orange, yellow)' :
                                       'linear-gradient(to right, darkblue, cyan)'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRANSFORM TAB */}
          {activeTab === 'transform' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scale</label>
                {['x', 'y', 'z'].map((axis, i) => (
                  <div key={`scale-${axis}`} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-4 uppercase">{axis}</span>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={transform.scale[i]}
                      onChange={(e) => {
                        const newScale = [...transform.scale] as [number, number, number];
                        newScale[i] = parseFloat(e.target.value);
                        setTransform({ ...transform, scale: newScale });
                      }}
                      className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="text-xs font-mono text-slate-400 w-8 text-right">{transform.scale[i].toFixed(1)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rotation</label>
                {['x', 'y', 'z'].map((axis, i) => (
                  <div key={`rot-${axis}`} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-4 uppercase">{axis}</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="15"
                      value={transform.rotation[i]}
                      onChange={(e) => {
                        const newRot = [...transform.rotation] as [number, number, number];
                        newRot[i] = parseFloat(e.target.value);
                        setTransform({ ...transform, rotation: newRot });
                      }}
                      className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <span className="text-xs font-mono text-slate-400 w-8 text-right">{transform.rotation[i]}°</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Translation</label>
                {['x', 'y', 'z'].map((axis, i) => (
                  <div key={`pos-${axis}`} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-4 uppercase">{axis}</span>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={transform.position[i]}
                      onChange={(e) => {
                        const newPos = [...transform.position] as [number, number, number];
                        newPos[i] = parseFloat(e.target.value);
                        setTransform({ ...transform, position: newPos });
                      }}
                      className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-xs font-mono text-slate-400 w-8 text-right">{transform.position[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ANALYSIS TAB */}
          {activeTab === 'analysis' && mode === '3D' && (
            <div className="space-y-6">
              {/* Cross Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cross Section</label>
                  <button
                    onClick={() => setCrossSection({ ...crossSection, enabled: !crossSection.enabled })}
                    className={`w-8 h-4 rounded-full relative transition-colors ${crossSection.enabled ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${crossSection.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                {crossSection.enabled && (
                  <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                    <div className="flex gap-2">
                      {['x', 'y', 'z'].map((axis) => (
                        <button
                          key={axis}
                          onClick={() => setCrossSection({ ...crossSection, axis: axis as any })}
                          className={`flex-1 py-1 text-xs font-bold uppercase rounded ${crossSection.axis === axis ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >
                          {axis}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={crossSection.value}
                      onChange={(e) => setCrossSection({ ...crossSection, value: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="text-center text-xs font-mono text-slate-300">
                      {crossSection.axis} = {crossSection.value}
                    </div>
                  </div>
                )}
              </div>

              {/* Derivatives */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Partial Derivatives</label>
                  <button
                    onClick={() => setDerivative({ ...derivative, enabled: !derivative.enabled })}
                    className={`w-8 h-4 rounded-full relative transition-colors ${derivative.enabled ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${derivative.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {derivative.enabled && (
                  <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                    <p className="text-xs text-slate-400 mb-2">Adjust point (x, y) to see tangent plane and gradient.</p>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>X</span>
                        <span>{derivative.x.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={xRange[0]}
                        max={xRange[1]}
                        step="0.1"
                        value={derivative.x}
                        onChange={(e) => setDerivative({ ...derivative, x: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Y</span>
                        <span>{derivative.y.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={yRange[0]}
                        max={yRange[1]}
                        step="0.1"
                        value={derivative.y}
                        onChange={(e) => setDerivative({ ...derivative, y: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'analysis' && mode === '2D' && (
            <div className="text-center py-10 text-slate-500 text-sm">
              Switch to 3D mode for advanced analysis tools.
            </div>
          )}
        </div>
      </div>

      {/* 3D Canvas Area */}
      <div className="flex-1 relative bg-black h-[60vh] md:h-screen">
        <Canvas>
          <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
          <OrbitControls autoRotate={autoRotate} autoRotateSpeed={2} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 20, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          <Axes size={Math.max(xRange[1], yRange[1]) + 2} />
          
          {mode === '3D' ? (
            <>
              <GraphSurface 
                expression={expression}
                xRange={xRange}
                yRange={yRange}
                resolution={resolution}
                showWireframe={showWireframe}
                colorMap={colorMap}
                transform={transform}
                crossSection={crossSection}
              />
              <DerivativeVisualizer 
                expression={expression} 
                point={{ x: derivative.x, y: derivative.y }} 
                enabled={derivative.enabled} 
              />
            </>
          ) : (
            <Graph2D 
              expression={expression}
              xRange={xRange}
              resolution={resolution}
              color="#00ffff"
            />
          )}
        </Canvas>

        <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 max-w-xs pointer-events-none">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-300">
              <p className="font-bold text-white mb-1">Controls</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Left Click + Drag to Rotate</li>
                <li>Right Click + Drag to Pan</li>
                <li>Scroll to Zoom</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="absolute top-6 right-6 flex gap-2">
           <button
             onClick={() => setAutoRotate(!autoRotate)}
             className={`p-2 rounded-full backdrop-blur-md border border-white/10 transition-colors ${autoRotate ? 'bg-cyan-600/80 text-white' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
             title="Auto Rotate"
           >
             <RefreshCw className={`w-5 h-5 ${autoRotate ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>
    </div>
  );
}
