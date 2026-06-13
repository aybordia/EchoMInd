"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { RampBoxPayload } from "@/lib/types";
import { SceneStage } from "./SceneStage";
import { StageHeader } from "./StageHeader";
import { sampleTrajectory } from "./mathHelpers";

const BOX_SIZE = 0.4;
const RAMP_THICKNESS = 0.2;

function Arrow({
  direction,
  length,
  color,
  label,
}: {
  direction: THREE.Vector3;
  length: number;
  color: string;
  label: string;
}) {
  const dir = direction.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const shaftLength = length * 0.75;
  const headLength = length * 0.25;

  return (
    <group quaternion={quaternion}>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, shaftLength, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, shaftLength + headLength / 2, 0]}>
        <coneGeometry args={[0.07, headLength, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, length + 0.18, 0]} center distanceFactor={9} occlude>
        <div className="text-[11px] font-semibold" style={{ color }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

function SlidingBox({
  trajectory,
  gravityDir,
  normalDir,
  frictionDir,
}: {
  trajectory: RampBoxPayload["trajectory"];
  gravityDir: THREE.Vector3;
  normalDir: THREE.Vector3;
  frictionDir: THREE.Vector3;
}) {
  const groupRef = useRef<Group>(null);
  const duration = trajectory[trajectory.length - 1]?.t ?? 1;
  const cycle = duration + 1;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = Math.min(state.clock.elapsedTime % cycle, duration);
    groupRef.current.position.x = sampleTrajectory(trajectory, t);
  });

  return (
    <group ref={groupRef} position={[0, BOX_SIZE / 2 + RAMP_THICKNESS / 2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
        <meshStandardMaterial
          color="#ff9d4d"
          emissive="#ff7a3d"
          emissiveIntensity={0.2}
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>
      <Arrow direction={gravityDir} length={0.9} color="#f87171" label="mg" />
      <Arrow direction={normalDir} length={0.7} color="#7dd3fc" label="N" />
      <Arrow direction={frictionDir} length={0.55} color="#facc15" label="f" />
    </group>
  );
}

export function RampBoxViewer({ payload }: { payload: RampBoxPayload }) {
  const angleRad = (payload.ramp_angle_deg * Math.PI) / 180;
  const rampLength = payload.ramp_length_m;

  const gravityDir = new THREE.Vector3(Math.sin(angleRad), -Math.cos(angleRad), 0);
  const normalDir = new THREE.Vector3(0, 1, 0);
  const frictionDir = new THREE.Vector3(-1, 0, 0);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <SceneStage cameraPosition={[2, 2.5, 6]} fov={45} maxDistance={14} minDistance={3} autoRotateSpeed={0.2}>
        <group rotation={[0, 0, -angleRad]}>
          <mesh position={[rampLength / 2, -RAMP_THICKNESS / 2, 0]} receiveShadow>
            <boxGeometry args={[rampLength, RAMP_THICKNESS, 1.6]} />
            <meshStandardMaterial color="#3a3f52" roughness={0.8} />
          </mesh>
          <SlidingBox
            trajectory={payload.trajectory}
            gravityDir={gravityDir}
            normalDir={normalDir}
            frictionDir={frictionDir}
          />
        </group>
        <mesh position={[rampLength / 2, -1.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 6]} />
          <meshStandardMaterial color="#0c0e16" />
        </mesh>
      </SceneStage>

      <StageHeader
        title="Ramp & Box Digital Twin"
        equation="a = g·sinθ − μg·cosθ"
        badges={[
          `θ ≈ ${payload.ramp_angle_deg}°`,
          `μ ≈ ${payload.friction_coefficient_estimate}`,
          payload.source === "tracked" ? "Tracked from your video" : "Estimated demo reconstruction",
        ]}
      />

      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 glass-panel px-4 py-3 text-xs text-foreground-muted sm:inset-x-6">
        {payload.takeaway}
      </div>
    </div>
  );
}
