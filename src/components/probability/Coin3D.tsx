import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface CoinProps {
  result: number | null; // 1 for Heads, 0 for Tails
  isFlipping: boolean;
}

const Coin = ({ result, isFlipping }: CoinProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));
  const currentRotation = useRef(new THREE.Euler(0, 0, 0));

  useEffect(() => {
    if (result !== null && !isFlipping) {
      // Set target rotation based on result
      // Heads (1) -> Face up (0, 0, 0)
      // Tails (0) -> Face down (Math.PI, 0, 0)
      // Add random spins for effect
      const spins = Math.floor(Math.random() * 2 + 2) * Math.PI * 2;
      const finalAngle = result === 1 ? 0 : Math.PI;
      targetRotation.current.set(finalAngle + spins, 0, 0);
    }
  }, [result, isFlipping]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isFlipping) {
      // Spin continuously
      meshRef.current.rotation.x += delta * 15;
      meshRef.current.rotation.y += delta * 5;
    } else {
      // Lerp to target rotation
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        targetRotation.current.x,
        delta * 5
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotation.current.y,
        delta * 5
      );
      
      // Normalize rotation to keep it clean
      if (Math.abs(meshRef.current.rotation.x - targetRotation.current.x) < 0.01) {
         meshRef.current.rotation.x = targetRotation.current.x % (Math.PI * 2);
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Coin Body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Heads Face (Top) */}
      <group position={[0, 0, 0.11]}>
        <Text
          position={[0, 0, 0]}
          fontSize={1.5}
          color="#92400e"
          anchorX="center"
          anchorY="middle"
        >
          H
        </Text>
      </group>

      {/* Tails Face (Bottom) */}
      <group position={[0, 0, -0.11]} rotation={[0, Math.PI, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={1.5}
          color="#92400e"
          anchorX="center"
          anchorY="middle"
        >
          T
        </Text>
      </group>
    </group>
  );
};

export default function Coin3D({ result, isFlipping }: CoinProps) {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Coin result={result} isFlipping={isFlipping} />
        <OrbitControls enableZoom={false} />
        <Environment preset="city" />
      </Canvas>
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <span className="bg-slate-900/80 px-3 py-1 rounded text-xs text-slate-300">
          {isFlipping ? 'Flipping...' : result === 1 ? 'HEADS' : result === 0 ? 'TAILS' : 'Ready'}
        </span>
      </div>
    </div>
  );
}
