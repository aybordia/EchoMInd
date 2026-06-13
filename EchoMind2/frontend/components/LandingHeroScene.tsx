"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Mesh } from "three";

function OrbCluster() {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.14;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04);
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1.1, 8]} />
          <meshStandardMaterial color="#ffb46d" emissive="#ff7a3d" emissiveIntensity={1.5} roughness={0.18} metalness={0.4} />
        </mesh>
      </Float>

      {[
        [2.2, 0.2, -0.3],
        [-2, -0.4, 0.8],
        [0.6, 1.8, -1.4],
        [-0.8, -1.7, -1.1],
      ].map((position, index) => (
        <Float key={index} speed={1.2 + index * 0.2} rotationIntensity={0.8} floatIntensity={1.1}>
          <mesh position={position as [number, number, number]}>
            <sphereGeometry args={[0.26 + index * 0.04, 32, 32]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#7dd3fc" : "#a78bfa"}
              emissive={index % 2 === 0 ? "#7dd3fc" : "#a78bfa"}
              emissiveIntensity={1.2}
              transparent
              opacity={0.92}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export function LandingHeroScene() {
  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 sm:h-[440px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,157,77,0.2),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(125,211,252,0.16),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(167,139,250,0.16),transparent_28%)]" />
      <Canvas camera={{ position: [0, 0, 6.2], fov: 42 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 3, 5]} intensity={25} color="#ffad66" />
        <pointLight position={[-4, -2, 4]} intensity={18} color="#7dd3fc" />
        <directionalLight position={[0, 3, 2]} intensity={2} color="#fff3e4" />
        <OrbCluster />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
