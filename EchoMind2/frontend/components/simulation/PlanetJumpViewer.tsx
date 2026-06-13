"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { PlanetJumpPayload, PlanetJumpPlanet } from "@/lib/types";
import { SceneStage } from "./SceneStage";
import { StageHeader } from "./StageHeader";
import { sampleKeyframes } from "./mathHelpers";

const HEIGHT_SCALE = 0.6;
const SPACING = 2.4;

function PlanetColumn({
  planet,
  x,
  highlighted,
}: {
  planet: PlanetJumpPlanet;
  x: number;
  highlighted: boolean;
}) {
  const jumperRef = useRef<Group>(null);
  const period = Math.max(planet.airtime_s, 0.4);

  useFrame((state) => {
    if (!jumperRef.current) return;
    const t = state.clock.elapsedTime % period;
    const y = sampleKeyframes(planet.keyframes, t);
    jumperRef.current.position.y = 0.85 + y * HEIGHT_SCALE;
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color={planet.color}
          emissive={highlighted ? planet.color : "#000000"}
          emissiveIntensity={highlighted ? 0.5 : 0}
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>

      {highlighted && (
        <mesh position={[0, 0.5, 0]} scale={1.22}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial color={planet.color} transparent opacity={0.12} />
        </mesh>
      )}

      <group ref={jumperRef} position={[0, 0.85, 0.95]}>
        <mesh castShadow>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#ffe3bf" emissive="#ff9d4d" emissiveIntensity={0.6} />
        </mesh>
      </group>

      <Html position={[0, 1.55, 0]} center distanceFactor={11} occlude>
        <div
          className={`whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] backdrop-blur-md ${
            highlighted
              ? "border-accent/40 bg-accent/15 text-accent-soft"
              : "border-white/10 bg-black/40 text-foreground-muted"
          }`}
        >
          <div className="font-semibold text-foreground">{planet.name}</div>
          <div>
            {planet.jump_height_m.toFixed(2)} m · {planet.airtime_s.toFixed(2)} s
          </div>
        </div>
      </Html>
    </group>
  );
}

export function PlanetJumpViewer({ payload }: { payload: PlanetJumpPayload }) {
  const startX = -((payload.planets.length - 1) * SPACING) / 2;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <SceneStage
        cameraPosition={[0, 3.5, 17]}
        fov={50}
        maxDistance={32}
        minDistance={6}
        autoRotateSpeed={0.18}
      >
        <gridHelper args={[28, 28, "#2a3040", "#161a24"]} />
        {payload.planets.map((planet, i) => (
          <PlanetColumn
            key={planet.name}
            planet={planet}
            x={startX + i * SPACING}
            highlighted={payload.highlight.includes(planet.name)}
          />
        ))}
      </SceneStage>
      <StageHeader title={payload.title} equation={payload.equation} badges={payload.labels} />
    </div>
  );
}
