import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Environment, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface DiceProps {
  result: number | null; // 1-6
  isRolling: boolean;
  sides?: number; // Default 6
}

const D6 = ({ result, isRolling }: { result: number | null, isRolling: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));

  // Map result to rotation
  // 1 (Top): 0, 0, 0
  // 6 (Bottom): PI, 0, 0
  // 2 (Front): PI/2, 0, 0
  // 5 (Back): -PI/2, 0, 0
  // 3 (Right): 0, 0, -PI/2
  // 4 (Left): 0, 0, PI/2
  
  const getRotation = (val: number) => {
    switch(val) {
      case 1: return [0, 0, 0];
      case 6: return [Math.PI, 0, 0];
      case 2: return [Math.PI/2, 0, 0];
      case 5: return [-Math.PI/2, 0, 0];
      case 3: return [0, 0, -Math.PI/2];
      case 4: return [0, 0, Math.PI/2];
      default: return [0, 0, 0];
    }
  };

  useEffect(() => {
    if (result !== null && !isRolling) {
      const [x, y, z] = getRotation(result);
      // Add random full rotations for effect
      const spins = Math.floor(Math.random() * 2 + 2) * Math.PI * 2;
      targetRotation.current.set(x + spins, y + spins, z + spins);
    }
  }, [result, isRolling]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isRolling) {
      meshRef.current.rotation.x += delta * 10;
      meshRef.current.rotation.y += delta * 7;
      meshRef.current.rotation.z += delta * 5;
    } else {
      // Lerp
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.current.x, delta * 5);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.current.y, delta * 5);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.current.z, delta * 5);
    }
  });

  return (
    <group ref={meshRef}>
      <RoundedBox args={[2, 2, 2]} radius={0.2} smoothness={4}>
        <meshStandardMaterial color="#f8fafc" />
      </RoundedBox>
      
      {/* 1 - Top (y+) */}
      <Text position={[0, 1.01, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={1.2} color="black">1</Text>
      
      {/* 6 - Bottom (y-) */}
      <Text position={[0, -1.01, 0]} rotation={[Math.PI/2, 0, 0]} fontSize={1.2} color="black">6</Text>
      
      {/* 2 - Front (z+) */}
      <Text position={[0, 0, 1.01]} fontSize={1.2} color="black">2</Text>
      
      {/* 5 - Back (z-) */}
      <Text position={[0, 0, -1.01]} rotation={[0, Math.PI, 0]} fontSize={1.2} color="black">5</Text>
      
      {/* 3 - Right (x+) */}
      <Text position={[1.01, 0, 0]} rotation={[0, Math.PI/2, 0]} fontSize={1.2} color="black">3</Text>
      
      {/* 4 - Left (x-) */}
      <Text position={[-1.01, 0, 0]} rotation={[0, -Math.PI/2, 0]} fontSize={1.2} color="black">4</Text>
    </group>
  );
};

export default function Dice3D({ result, isRolling, sides = 6 }: DiceProps) {
  // Only D6 supported for now visually, but we can add others later
  // If sides != 6, we might just show a generic dice or fallback
  
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <D6 result={result} isRolling={isRolling} />
        <OrbitControls enableZoom={false} />
        <Environment preset="studio" />
      </Canvas>
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <span className="bg-slate-900/80 px-3 py-1 rounded text-xs text-slate-300">
          {isRolling ? 'Rolling...' : result ? `Result: ${result}` : 'Ready'}
        </span>
      </div>
    </div>
  );
}
