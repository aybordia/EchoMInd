"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Suspense, type ReactNode } from "react";

interface SceneStageProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  enableZoom?: boolean;
}

/** Shared cinematic Three.js stage: lighting, starfield, and a slow auto-orbit camera. */
export function SceneStage({
  children,
  cameraPosition = [0, 2.5, 9],
  fov = 42,
  autoRotateSpeed = 0.35,
  minDistance = 3,
  maxDistance = 22,
  enableZoom = true,
}: SceneStageProps) {
  return (
    <Canvas camera={{ position: cameraPosition, fov }} dpr={[1, 1.5]} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <color attach="background" args={["#05060a"]} />
        <fog attach="fog" args={["#05060a", 14, 34]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[6, 9, 6]} intensity={1.4} color="#fff3e0" castShadow />
        <pointLight position={[-8, 4, -6]} intensity={0.7} color="#7dd3fc" />
        <Stars radius={90} depth={50} count={2000} factor={3.2} fade speed={0.4} />
        {children}
        <OrbitControls
          enablePan={false}
          enableZoom={enableZoom}
          autoRotate
          autoRotateSpeed={autoRotateSpeed}
          minDistance={minDistance}
          maxDistance={maxDistance}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Suspense>
    </Canvas>
  );
}
