"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh } from "three";
import type { MoonDropObject, MoonDropPayload } from "@/lib/types";
import { SceneStage } from "./SceneStage";
import { StageHeader } from "./StageHeader";

const SCALE = 0.5;
const POSITIONS = [-1.1, 1.1];

function FallingObject({
  obj,
  x,
  dropHeightUnits,
  fallTime,
  cycle,
}: {
  obj: MoonDropObject;
  x: number;
  dropHeightUnits: number;
  fallTime: number;
  cycle: number;
}) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = Math.min(state.clock.elapsedTime % cycle, fallTime);
    const progress = fallTime > 0 ? t / fallTime : 1;
    const y = dropHeightUnits * (1 - progress * progress);
    ref.current.position.y = Math.max(0, y) + obj.radius;
  });

  return (
    <mesh ref={ref} position={[x, dropHeightUnits + obj.radius, 0]} castShadow>
      <sphereGeometry args={[obj.radius, 24, 24]} />
      <meshStandardMaterial color={obj.color} roughness={0.45} metalness={0.1} />
    </mesh>
  );
}

export function MoonDropViewer({ payload }: { payload: MoonDropPayload }) {
  const dropHeightUnits = payload.drop_height_m * SCALE;
  const cycle = payload.fall_time_s + 1.2;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <SceneStage cameraPosition={[0, 2, 7]} fov={45} maxDistance={16} minDistance={3} autoRotateSpeed={0.22}>
        <gridHelper args={[16, 16, "#2a3040", "#161a24"]} />
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial color="#0c0e16" />
        </mesh>

        {payload.objects.map((obj, i) => (
          <FallingObject
            key={obj.name}
            obj={obj}
            x={POSITIONS[i] ?? 0}
            dropHeightUnits={dropHeightUnits}
            fallTime={payload.fall_time_s}
            cycle={cycle}
          />
        ))}

        {payload.objects.map((obj, i) => (
          <Html
            key={`${obj.name}-label`}
            position={[POSITIONS[i] ?? 0, dropHeightUnits + obj.radius + 0.55, 0]}
            center
            distanceFactor={9}
            occlude
          >
            <div className="whitespace-nowrap rounded-xl border border-white/10 bg-black/40 px-2.5 py-1 text-center text-[11px] text-foreground-muted backdrop-blur-md">
              <div className="font-semibold text-foreground">{obj.name}</div>
              <div>{obj.mass_kg} kg</div>
            </div>
          </Html>
        ))}
      </SceneStage>

      <StageHeader
        title={payload.title}
        equation={payload.equation}
        badges={[
          `Moon g = ${payload.gravity_m_s2} m/s²`,
          `Fall time: ${payload.fall_time_s} s`,
          ...payload.labels,
        ]}
      />

      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 glass-panel px-4 py-3 text-xs text-foreground-muted sm:inset-x-6">
        {payload.comparison.label} On Earth: ball ≈ {payload.comparison.earth_fall_time_ball_s}s,
        feather ≈ {payload.comparison.earth_fall_time_feather_s}s.
      </div>
    </div>
  );
}
