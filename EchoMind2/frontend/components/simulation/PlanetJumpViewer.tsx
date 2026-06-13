"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { PlanetJumpPayload, PlanetJumpPlanet } from "@/lib/types";
import { SceneStage } from "./SceneStage";
import { StageHeader } from "./StageHeader";
import { AstronautFigure } from "./AstronautFigure";
import { sampleKeyframes } from "./mathHelpers";

const HEIGHT_SCALE = 0.85;
const SPACING = 2.7;
const PLANET_R = 0.78;

function PlanetColumn({
  planet,
  x,
  highlighted,
  focused,
}: {
  planet: PlanetJumpPlanet;
  x: number;
  highlighted: boolean;
  focused: boolean;
}) {
  const jumperRef = useRef<Group>(null);
  const period = Math.max(planet.airtime_s, 0.4);
  // stagger each planet's jump phase so the row feels alive, not synchronized
  const phase = useRef(Math.random() * period);

  useFrame((state) => {
    if (!jumperRef.current) return;
    const t = (state.clock.elapsedTime + phase.current) % period;
    const y = sampleKeyframes(planet.keyframes, t);
    jumperRef.current.position.y = PLANET_R + 0.18 + y * HEIGHT_SCALE;
    jumperRef.current.rotation.y += 0.01;
  });

  const lit = focused || highlighted;

  return (
    <group position={[x, 0, 0]} scale={focused ? 1.12 : 1}>
      <mesh position={[0, PLANET_R, 0]} castShadow receiveShadow>
        <sphereGeometry args={[PLANET_R, 48, 48]} />
        <meshStandardMaterial
          color={planet.color}
          emissive={lit ? planet.color : "#05060a"}
          emissiveIntensity={focused ? 0.7 : highlighted ? 0.35 : 0.04}
          roughness={0.65}
          metalness={0.2}
        />
      </mesh>

      {highlighted && (
        <>
          <mesh position={[0, PLANET_R, 0]} scale={1.16}>
            <sphereGeometry args={[PLANET_R, 32, 32]} />
            <meshBasicMaterial color={planet.color} transparent opacity={0.1} />
          </mesh>
          {/* glow ring marking the comparison hero planets */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[PLANET_R * 1.3, PLANET_R * 1.5, 48]} />
            <meshBasicMaterial color={planet.color} transparent opacity={0.5} />
          </mesh>
        </>
      )}

      <group ref={jumperRef} position={[0, PLANET_R + 0.18, 0]}>
        <AstronautFigure scale={0.9} accent={highlighted ? "#ffd27d" : "#ff9d4d"} />
      </group>

      <Html position={[0, PLANET_R * 2 + 0.5, 0]} center distanceFactor={11} occlude>
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

export function PlanetJumpViewer({
  payload,
  activeFocus,
}: {
  payload: PlanetJumpPayload;
  activeFocus?: string | null;
}) {
  const n = payload.planets.length;
  const startX = -((n - 1) * SPACING) / 2;
  const mid = (n - 1) / 2;

  // Map the active narration focus to a camera move: push in on the named
  // planet, or pull back to a wide comparison shot on "overview".
  const focusIndex = payload.planets.findIndex((p) => p.name === activeFocus);
  const cameraFocus =
    focusIndex >= 0
      ? (() => {
          const z = -Math.pow((focusIndex - mid) / mid, 2) * 1.6;
          const px = startX + focusIndex * SPACING;
          return {
            lookAt: [px, PLANET_R + 0.4, z] as [number, number, number],
            position: [px + 0.6, PLANET_R + 2.2, z + 6.2] as [number, number, number],
          };
        })()
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <SceneStage
        cameraPosition={[0, 4.2, 18]}
        fov={48}
        maxDistance={34}
        minDistance={7}
        autoRotateSpeed={0.16}
        cameraFocus={cameraFocus}
      >
        {payload.planets.map((planet, i) => {
          // gentle arc: planets near the center sit slightly forward
          const z = -Math.pow((i - mid) / mid, 2) * 1.6;
          return (
            <group key={planet.name} position={[0, 0, z]}>
              <PlanetColumn
                planet={planet}
                x={startX + i * SPACING}
                highlighted={payload.highlight.includes(planet.name)}
                focused={!!activeFocus && activeFocus === planet.name}
              />
            </group>
          );
        })}
      </SceneStage>
      <StageHeader title={payload.title} equation={payload.equation} badges={payload.labels} />
    </div>
  );
}
