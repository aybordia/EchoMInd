"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Environment,
  Lightformer,
  ContactShadows,
  AdaptiveDpr,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  DepthOfField,
  N8AO,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { ACESFilmicToneMapping } from "three";
import { Suspense, type ReactNode } from "react";

interface SceneStageProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  enableZoom?: boolean;
  /** Deep-space starfield (planets/moon) vs a clean studio void (molecules/ramp). */
  starfield?: boolean;
  /** Soft contact shadow on the ground plane. */
  groundShadow?: boolean;
  /** Tint of the key light. */
  keyColor?: string;
}

/**
 * Shared cinematic stage — the "looks real" baseline for every viewer:
 * inline image-based lighting (offline-safe), a 3-point rig, soft contact
 * shadows, and a postprocessing grade (N8AO ambient occlusion, bloom, subtle
 * depth of field, vignette, ACES tone mapping).
 * See 07_CINEMATIC_RENDER_ENGINE.md.
 */
export function SceneStage({
  children,
  cameraPosition = [0, 2.5, 9],
  fov = 42,
  autoRotateSpeed = 0.35,
  minDistance = 3,
  maxDistance = 22,
  enableZoom = true,
  starfield = true,
  groundShadow = true,
  keyColor = "#fff3e0",
}: SceneStageProps) {
  return (
    <Canvas
      shadows
      camera={{ position: cameraPosition, fov }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        powerPreference: "high-performance",
      }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={["#05060a"]} />
        <fog attach="fog" args={["#05060a", 16, 42]} />

        {/* Image-based lighting — inline lightformers, no remote HDR fetch (works offline). */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.4} color={keyColor} position={[6, 8, 6]} scale={[12, 12, 1]} />
          <Lightformer intensity={0.9} color="#7dd3fc" position={[-9, 4, -6]} scale={[10, 10, 1]} />
          <Lightformer intensity={1.6} color="#c4b5fd" position={[0, -6, 4]} scale={[10, 6, 1]} />
        </Environment>

        {/* Direct 3-point rig on top of IBL for crisp highlights and real shadows. */}
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[6, 9, 6]}
          intensity={2.2}
          color={keyColor}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
        />
        <pointLight position={[-8, 4, -6]} intensity={0.6} color="#7dd3fc" />
        <pointLight position={[0, 6, -8]} intensity={1.4} color="#ffffff" />

        {starfield && (
          <Stars radius={120} depth={60} count={2600} factor={3.6} fade speed={0.4} />
        )}

        {children}

        {groundShadow && (
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.55}
            scale={40}
            blur={2.6}
            far={14}
            resolution={1024}
            color="#000000"
          />
        )}

        <OrbitControls
          enablePan={false}
          enableZoom={enableZoom}
          autoRotate
          autoRotateSpeed={autoRotateSpeed}
          minDistance={minDistance}
          maxDistance={maxDistance}
          maxPolarAngle={Math.PI / 1.7}
        />

        <EffectComposer enableNormalPass multisampling={4}>
          <N8AO aoRadius={0.9} intensity={1.6} distanceFalloff={1} color="#04050a" />
          <Bloom intensity={0.85} luminanceThreshold={0.72} luminanceSmoothing={0.32} mipmapBlur />
          <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.2} />
          <Vignette eskil={false} offset={0.28} darkness={0.62} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>

        <AdaptiveDpr pixelated />
      </Suspense>
    </Canvas>
  );
}
