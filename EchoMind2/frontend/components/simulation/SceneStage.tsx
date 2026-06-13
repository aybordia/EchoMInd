"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
import { easing } from "maath";
import { ToneMappingMode } from "postprocessing";
import { ACESFilmicToneMapping, type Vector3 } from "three";
import { Suspense, type ReactNode } from "react";

interface OrbitLike {
  target: Vector3;
  autoRotate: boolean;
  autoRotateSpeed: number;
  update: () => void;
}

export interface CameraFocus {
  lookAt: [number, number, number];
  position: [number, number, number];
}

interface SceneStageProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  enableZoom?: boolean;
  disableOrbitControls?: boolean;
  starfield?: boolean;
  groundShadow?: boolean;
  keyColor?: string;
  cameraFocus?: CameraFocus | null;
}

function CameraDirector({
  focus,
  overview,
  autoRotateSpeed,
}: {
  focus?: CameraFocus | null;
  overview: [number, number, number];
  autoRotateSpeed: number;
}) {
  const controls = useThree((s) => s.controls) as OrbitLike | null;
  const camera = useThree((s) => s.camera);

  useFrame((_, dt) => {
    if (!controls) return;
    if (focus) {
      controls.autoRotate = false;
      easing.damp3(camera.position, focus.position, 0.55, dt);
      easing.damp3(controls.target, focus.lookAt, 0.55, dt);
    } else {
      controls.autoRotate = true;
      controls.autoRotateSpeed = autoRotateSpeed;
      easing.damp3(camera.position, overview, 0.9, dt);
      easing.damp3(controls.target, [0, 0.8, 0], 0.9, dt);
    }
    controls.update();
  });
  return null;
}

export function SceneStage({
  children,
  cameraPosition = [0, 2.5, 9],
  fov = 42,
  autoRotateSpeed = 0.35,
  minDistance = 3,
  maxDistance = 22,
  enableZoom = true,
  disableOrbitControls = false,
  starfield = true,
  groundShadow = true,
  keyColor = "#fff3e0",
  cameraFocus,
}: SceneStageProps) {
  const directed = cameraFocus !== undefined;
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

        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.4} color={keyColor} position={[6, 8, 6]} scale={[12, 12, 1]} />
          <Lightformer intensity={0.9} color="#7dd3fc" position={[-9, 4, -6]} scale={[10, 10, 1]} />
          <Lightformer intensity={1.6} color="#c4b5fd" position={[0, -6, 4]} scale={[10, 6, 1]} />
        </Environment>

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

        {starfield && <Stars radius={120} depth={60} count={2600} factor={3.6} fade speed={0.4} />}

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

        {!disableOrbitControls && (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={enableZoom}
            autoRotate
            autoRotateSpeed={autoRotateSpeed}
            minDistance={minDistance}
            maxDistance={maxDistance}
            maxPolarAngle={Math.PI / 1.7}
          />
        )}

        {directed && !disableOrbitControls && (
          <CameraDirector focus={cameraFocus} overview={cameraPosition} autoRotateSpeed={autoRotateSpeed} />
        )}

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
