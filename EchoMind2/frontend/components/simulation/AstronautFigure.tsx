"use client";

import { useMemo } from "react";
import { MeshStandardMaterial } from "three";

/**
 * A small stylized astronaut figure used as the "jumper" on each planet.
 * Built from primitives so it stays light (no external model fetch) while
 * reading clearly as a person — glossy suit, dark limbs, an emissive visor
 * that catches the bloom pass.
 */
export function AstronautFigure({
  scale = 1,
  suitColor = "#eef2ff",
  accent = "#ff9d4d",
}: {
  scale?: number;
  suitColor?: string;
  accent?: string;
}) {
  const suit = useMemo(
    () => new MeshStandardMaterial({ color: suitColor, roughness: 0.45, metalness: 0.1 }),
    [suitColor]
  );
  const joint = useMemo(
    () => new MeshStandardMaterial({ color: "#2b3040", roughness: 0.6, metalness: 0.2 }),
    []
  );
  const visor = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#10131c",
        roughness: 0.1,
        metalness: 0.6,
        emissive: accent,
        emissiveIntensity: 0.7,
      }),
    [accent]
  );

  return (
    <group scale={scale} castShadow>
      {/* helmet */}
      <mesh position={[0, 0.62, 0]} material={suit} castShadow>
        <sphereGeometry args={[0.17, 24, 24]} />
      </mesh>
      {/* visor */}
      <mesh position={[0, 0.62, 0.1]} material={visor}>
        <sphereGeometry args={[0.13, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.32, 0]} material={suit} castShadow>
        <capsuleGeometry args={[0.15, 0.24, 8, 16]} />
      </mesh>
      {/* backpack */}
      <mesh position={[0, 0.34, -0.16]} material={joint} castShadow>
        <boxGeometry args={[0.2, 0.26, 0.12]} />
      </mesh>
      {/* arms (raised mid-jump) */}
      <mesh position={[-0.21, 0.42, 0]} rotation={[0, 0, 0.9]} material={suit} castShadow>
        <capsuleGeometry args={[0.06, 0.22, 6, 12]} />
      </mesh>
      <mesh position={[0.21, 0.42, 0]} rotation={[0, 0, -0.9]} material={suit} castShadow>
        <capsuleGeometry args={[0.06, 0.22, 6, 12]} />
      </mesh>
      {/* legs (tucked for the leap) */}
      <mesh position={[-0.08, 0.04, 0.02]} rotation={[0.35, 0, 0.08]} material={joint} castShadow>
        <capsuleGeometry args={[0.07, 0.2, 6, 12]} />
      </mesh>
      <mesh position={[0.08, 0.04, 0.02]} rotation={[0.35, 0, -0.08]} material={joint} castShadow>
        <capsuleGeometry args={[0.07, 0.2, 6, 12]} />
      </mesh>
    </group>
  );
}
