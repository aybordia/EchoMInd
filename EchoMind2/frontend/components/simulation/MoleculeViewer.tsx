"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { MoleculeEntity, MoleculeInteractionPayload } from "@/lib/types";
import { SceneStage } from "./SceneStage";
import { StageHeader } from "./StageHeader";
import { lerpVec3, pingPong } from "./mathHelpers";

function findAtomOffset(molecule: MoleculeEntity, atomId: string): [number, number, number] {
  return molecule.atoms.find((a) => a.id === atomId)?.offset ?? [0, 0, 0];
}

function Bond({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.06, 0.06, length, 8]} />
      <meshStandardMaterial color="#cfd3dc" roughness={0.6} />
    </mesh>
  );
}

function MoleculeGroup({ molecule, progress }: { molecule: MoleculeEntity; progress: number }) {
  const position = lerpVec3(molecule.start_position, molecule.end_position, progress);

  return (
    <group position={position}>
      {molecule.bonds.map(([fromId, toId]) => {
        const from = molecule.atoms.find((a) => a.id === fromId);
        const to = molecule.atoms.find((a) => a.id === toId);
        if (!from || !to) return null;
        return <Bond key={`${fromId}-${toId}`} from={from.offset} to={to.offset} />;
      })}

      {molecule.atoms.map((atom) => (
        <group key={atom.id} position={atom.offset}>
          <mesh castShadow>
            <sphereGeometry args={[atom.radius, 24, 24]} />
            <meshStandardMaterial
              color={atom.color}
              emissive={atom.color}
              emissiveIntensity={0.18}
              roughness={0.35}
              metalness={0.05}
            />
          </mesh>
          <Html position={[0, atom.radius + 0.28, 0]} center distanceFactor={9} occlude>
            <div className="whitespace-nowrap text-[11px] font-semibold text-foreground/90 drop-shadow-md">
              {atom.label}
              {atom.partial_charge === "positive" && (
                <span className="text-accent-soft"> δ+</span>
              )}
              {atom.partial_charge === "negative" && (
                <span className="text-accent-cool-soft"> δ-</span>
              )}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function InteractionLine({
  payload,
  progress,
}: {
  payload: MoleculeInteractionPayload;
  progress: number;
}) {
  const fromMol = payload.molecules.find((m) => m.id === payload.interaction.from.molecule);
  const toMol = payload.molecules.find((m) => m.id === payload.interaction.to.molecule);
  if (!fromMol || !toMol) return null;

  const fromOffset = findAtomOffset(fromMol, payload.interaction.from.atom);
  const toOffset = findAtomOffset(toMol, payload.interaction.to.atom);

  const fromPos = lerpVec3(fromMol.start_position, fromMol.end_position, progress);
  const toPos = lerpVec3(toMol.start_position, toMol.end_position, progress);

  const start: [number, number, number] = [
    fromPos[0] + fromOffset[0],
    fromPos[1] + fromOffset[1],
    fromPos[2] + fromOffset[2],
  ];
  const end: [number, number, number] = [
    toPos[0] + toOffset[0],
    toPos[1] + toOffset[1],
    toPos[2] + toOffset[2],
  ];
  const mid = lerpVec3(start, end, 0.5);

  return (
    <>
      <Line
        points={[start, end]}
        color="#ff9d4d"
        lineWidth={1.5 + progress * 2}
        dashed
        dashSize={0.16}
        gapSize={0.12}
        transparent
        opacity={0.3 + progress * 0.55}
      />
      <Html position={mid} center distanceFactor={10} occlude>
        <div className="max-w-[200px] rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-center text-[10px] text-accent-soft backdrop-blur-md">
          {payload.interaction.label}
        </div>
      </Html>
    </>
  );
}

function MoleculeScene({ payload }: { payload: MoleculeInteractionPayload }) {
  const [progress, setProgress] = useState(0);
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    if (elapsed - lastUpdate.current > 0.05) {
      lastUpdate.current = elapsed;
      setProgress(pingPong(elapsed, payload.animation.duration_s));
    }
  });

  return (
    <>
      {payload.molecules.map((molecule) => (
        <MoleculeGroup key={molecule.id} molecule={molecule} progress={progress} />
      ))}
      <InteractionLine payload={payload} progress={progress} />
    </>
  );
}

export function MoleculeViewer({ payload }: { payload: MoleculeInteractionPayload }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <SceneStage cameraPosition={[0, 1.4, 7]} fov={42} maxDistance={14} minDistance={3} autoRotateSpeed={0.25}>
        <MoleculeScene payload={payload} />
      </SceneStage>
      <StageHeader title={payload.title} badges={[payload.accuracy_note]} />
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 glass-panel px-4 py-3 text-xs text-foreground-muted sm:inset-x-6">
        {payload.takeaway}
      </div>
    </div>
  );
}
