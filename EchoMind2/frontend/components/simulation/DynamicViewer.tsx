"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";
import type { DynamicPayload } from "@/lib/types";
import { SceneStage } from "./SceneStage";
import { StageHeader } from "./StageHeader";
import { JourneyCamera } from "./JourneyCamera";
import { ClockController } from "./SimClock";
import type { JourneyWaypoint } from "./JourneyOrb";

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTILE — Roller coaster track with loop, animated car riding the rail
// ═══════════════════════════════════════════════════════════════════════════

interface Trajectory {
  label: string;
  color: string;
  max_height_m: number;
  range_m: number;
  flight_time_s: number;
  keyframes: { t: number; x: number; y: number }[];
}

function RollerCoasterTrack() {
  const trackPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * 24 - 12;
      let y = 0.1;
      // Initial climb
      if (t < 0.15) y = t / 0.15 * 6;
      // First drop
      else if (t < 0.3) y = 6 - ((t - 0.15) / 0.15) * 5;
      // Loop (circle center at t=0.4, x ≈ -2.4)
      else if (t < 0.55) {
        const loopT = (t - 0.3) / 0.25;
        const angle = -Math.PI / 2 + loopT * Math.PI * 2;
        y = 3.5 + Math.sin(angle) * 2.5;
      }
      // Valley
      else if (t < 0.65) y = 1 + Math.sin((t - 0.55) / 0.1 * Math.PI) * 0.5;
      // Hill
      else if (t < 0.8) {
        const hillT = (t - 0.65) / 0.15;
        y = 1 + Math.sin(hillT * Math.PI) * 3;
      }
      // Final descent
      else y = 1 - ((t - 0.8) / 0.2) * 0.9;
      pts.push(new THREE.Vector3(x, Math.max(0.1, y), 0));
    }
    return pts;
  }, []);

  const railL = useMemo(() => trackPoints.map(p => new THREE.Vector3(p.x, p.y, -0.3)), [trackPoints]);
  const railR = useMemo(() => trackPoints.map(p => new THREE.Vector3(p.x, p.y, 0.3)), [trackPoints]);

  // Support pillars
  const pillars = useMemo(() => {
    const ps: { x: number; h: number }[] = [];
    for (let i = 0; i < trackPoints.length; i += 12) {
      const p = trackPoints[i];
      if (p.y > 0.5) ps.push({ x: p.x, h: p.y });
    }
    return ps;
  }, [trackPoints]);

  return (
    <group>
      <Line points={railL} color="#e03030" lineWidth={3} />
      <Line points={railR} color="#e03030" lineWidth={3} />
      {/* Cross ties */}
      {trackPoints.filter((_, i) => i % 6 === 0).map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.7]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* Support pillars */}
      {pillars.map((p, i) => (
        <mesh key={`pillar-${i}`} position={[p.x, p.h / 2, 0]}>
          <boxGeometry args={[0.12, p.h, 0.12]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function CoasterCar({ trajectories, simulationTime = 0, timelineDuration = 12 }: { trajectories: Trajectory[]; simulationTime?: number; timelineDuration?: number }) {
  const carRef = useRef<Group>(null);
  const totalTime = timelineDuration;

  const trackPath = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * 24 - 12;
      let y = 0.1;
      if (t < 0.15) y = t / 0.15 * 6;
      else if (t < 0.3) y = 6 - ((t - 0.15) / 0.15) * 5;
      else if (t < 0.55) {
        const loopT = (t - 0.3) / 0.25;
        const angle = -Math.PI / 2 + loopT * Math.PI * 2;
        y = 3.5 + Math.sin(angle) * 2.5;
      }
      else if (t < 0.65) y = 1 + Math.sin((t - 0.55) / 0.1 * Math.PI) * 0.5;
      else if (t < 0.8) {
        const hillT = (t - 0.65) / 0.15;
        y = 1 + Math.sin(hillT * Math.PI) * 3;
      }
      else y = 1 - ((t - 0.8) / 0.2) * 0.9;
      pts.push(new THREE.Vector3(x, Math.max(0.1, y), 0));
    }
    return pts;
  }, []);

  useFrame(() => {
    if (!carRef.current || trackPath.length < 2) return;
    const t = simulationTime % totalTime;
    const frac = t / totalTime;
    const idx = Math.min(Math.floor(frac * (trackPath.length - 1)), trackPath.length - 2);
    const localT = frac * (trackPath.length - 1) - idx;
    const p = trackPath[idx].clone().lerp(trackPath[idx + 1], localT);
    carRef.current.position.set(p.x, p.y + 0.15, 0);

    // Tilt car along track tangent
    const next = trackPath[Math.min(idx + 2, trackPath.length - 1)];
    const dir = next.clone().sub(trackPath[idx]).normalize();
    carRef.current.rotation.z = Math.atan2(dir.y, dir.x);
  });

  return (
    <group ref={carRef}>
      {/* Car body */}
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.3, 0.5]} />
        <meshStandardMaterial color="#2266ff" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Passengers */}
      {[-0.15, 0.15].map((z, i) => (
        <mesh key={i} position={[0, 0.3, z]} castShadow>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color="#ffe0b2" />
        </mesh>
      ))}
      {/* Wheels */}
      {[[-0.25, -0.15], [0.25, -0.15]].map(([x, y], i) => (
        <mesh key={`w${i}`} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 12]} />
          <meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Speed glow */}
      <pointLight color="#4488ff" intensity={3} distance={3} />
    </group>
  );
}

function ProjectileScene({
  computed,
  simulationTime,
  timelineDuration,
}: {
  computed: { trajectories: Trajectory[] };
  simulationTime?: number;
  timelineDuration?: number;
}) {
  const trajs = computed.trajectories || [];
  return (
    <>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[30, 16]} />
        <meshStandardMaterial color="#1a2030" metalness={0.3} roughness={0.7} />
      </mesh>
      <gridHelper args={[30, 30, "#2a3050", "#161a28"]} position={[0, 0.01, 0]} />

      <RollerCoasterTrack />
      <CoasterCar trajectories={trajs} simulationTime={simulationTime} timelineDuration={timelineDuration} />

      {/* Info labels for each trajectory comparison */}
      {trajs.map((traj, i) => (
        <Html key={traj.label} position={[-10 + i * 5, 7.5, 0]} center distanceFactor={14}>
          <div className="whitespace-nowrap rounded-xl border border-white/15 bg-black/60 px-3 py-1.5 text-center text-[11px] backdrop-blur-md">
            <div className="font-bold" style={{ color: traj.color }}>{traj.label}</div>
            <div className="text-foreground-muted">
              {traj.max_height_m}m peak · {traj.range_m}m range
            </div>
            <div className="text-foreground-muted">{traj.flight_time_s}s flight</div>
          </div>
        </Html>
      ))}

      {/* Decorative trees */}
      {[-8, -5, 5, 8, 10].map((x, i) => (
        <group key={`tree-${i}`} position={[x, 0, 3 + i * 0.5]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 1, 8]} />
            <meshStandardMaterial color="#4a3520" />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <coneGeometry args={[0.6, 1.2, 8]} />
            <meshStandardMaterial color="#1a5a2a" />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDULUM — Playground swing set with chains and seats
// ═══════════════════════════════════════════════════════════════════════════

interface PendulumData {
  label: string;
  length_m: number;
  period_s: number;
  color: string;
}

function SwingSet({ pendulums }: { pendulums: PendulumData[] }) {
  const width = pendulums.length * 2.5 + 1;
  return (
    <group>
      {/* A-frame legs */}
      {[-width / 2, width / 2].map((x, i) => (
        <group key={`leg-${i}`}>
          <mesh position={[x, 3, -1.2]} rotation={[0.15, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 6.2, 12]} />
            <meshStandardMaterial color="#cc4400" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[x, 3, 1.2]} rotation={[-0.15, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 6.2, 12]} />
            <meshStandardMaterial color="#cc4400" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Top bar */}
      <mesh position={[0, 6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, width + 0.5, 16]} />
        <meshStandardMaterial color="#cc4400" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

function SwingSeat({
  pend,
  index,
  total,
  simulationTime = 0,
}: {
  pend: PendulumData;
  index: number;
  total: number;
  simulationTime?: number;
}) {
  const groupRef = useRef<Group>(null);
  const spacing = 2.5;
  const x = (index - (total - 1) / 2) * spacing;
  const chainLen = Math.min(pend.length_m * 1.2, 4.5);
  const maxAngle = 0.6;

  useFrame(() => {
    if (!groupRef.current) return;
    const t = simulationTime;
    const angle = maxAngle * Math.cos((2 * Math.PI / pend.period_s) * t);
    groupRef.current.rotation.z = angle;
  });

  return (
    <group position={[x, 6, 0]}>
      <group ref={groupRef}>
        {/* Chains (two per swing) */}
        {[-0.15, 0.15].map((z, i) => (
          <mesh key={`chain-${i}`} position={[0, -chainLen / 2, z]}>
            <cylinderGeometry args={[0.02, 0.02, chainLen, 6]} />
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
        {/* Seat */}
        <mesh position={[0, -chainLen, 0]} castShadow>
          <boxGeometry args={[0.5, 0.06, 0.35]} />
          <meshStandardMaterial color={pend.color} roughness={0.6} />
        </mesh>
        {/* Person on swing */}
        <group position={[0, -chainLen + 0.5, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.12, 0.3, 8, 12]} />
            <meshStandardMaterial color="#4488cc" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#ffe0b2" />
          </mesh>
        </group>
        {/* Label */}
        <Html position={[0, -chainLen - 0.8, 0]} center distanceFactor={11}>
          <div className="whitespace-nowrap rounded-xl border border-white/15 bg-black/60 px-2.5 py-1 text-center text-[10px] backdrop-blur-md">
            <div className="font-bold" style={{ color: pend.color }}>{pend.label}</div>
            <div className="text-foreground-muted">T = {pend.period_s}s · L = {pend.length_m}m</div>
          </div>
        </Html>
      </group>
    </group>
  );
}

function PendulumScene({
  computed,
  simulationTime,
}: {
  computed: { pendulums: PendulumData[]; gravity: number };
  simulationTime?: number;
}) {
  const pends = computed.pendulums || [];
  return (
    <>
      {/* Playground ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[24, 16]} />
        <meshStandardMaterial color="#2a1f15" roughness={0.9} />
      </mesh>
      {/* Wood chip texture overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#3a2a18" roughness={0.95} transparent opacity={0.7} />
      </mesh>

      <SwingSet pendulums={pends} />
      {pends.map((p, i) => (
        <SwingSeat key={p.label} pend={p} index={i} total={pends.length} simulationTime={simulationTime} />
      ))}

      {/* Playground fence */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={`fence-${i}`} position={[-10 + i * 1.1, 0.4, 5]}>
          <boxGeometry args={[0.05, 0.8, 0.05]} />
          <meshStandardMaterial color="#8B7355" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.75, 5]}>
        <boxGeometry args={[22, 0.05, 0.05]} />
        <meshStandardMaterial color="#8B7355" roughness={0.7} />
      </mesh>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ENERGY — 3D objects representing real-world energy sources, not bars
// ═══════════════════════════════════════════════════════════════════════════

interface EnergyBar {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function EnergyObject({
  bar,
  index,
  total,
  maxVal,
  simulationTime = 0,
}: {
  bar: EnergyBar;
  index: number;
  total: number;
  maxVal: number;
  simulationTime?: number;
}) {
  const ref = useRef<Group>(null);
  const spacing = 3;
  const x = (index - (total - 1) / 2) * spacing;
  const barHeight = (bar.value / maxVal) * 5;

  useFrame(() => {
    if (!ref.current) return;
    const t = simulationTime;
    const grow = Math.min(1, t * 0.4);
    ref.current.scale.y = Math.max(0.01, grow);
    // Subtle float
    ref.current.position.y = barHeight * grow / 2 + Math.sin(t + index) * 0.05;
  });

  return (
    <group position={[x, 0, 0]}>
      {/* Glowing pedestal */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.8, 0.9, 0.1, 24]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Energy column with glow */}
      <group ref={ref}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.6, barHeight, 24]} />
          <meshStandardMaterial
            color={bar.color}
            emissive={bar.color}
            emissiveIntensity={0.4}
            roughness={0.25}
            metalness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Inner glow core */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.3, barHeight * 0.95, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={bar.color}
            emissiveIntensity={1.2}
            transparent
            opacity={0.3}
          />
        </mesh>
        <pointLight position={[0, barHeight / 2, 0]} color={bar.color} intensity={2} distance={5} />
      </group>

      {/* Label */}
      <Html position={[0, barHeight + 1.2, 0]} center distanceFactor={12}>
        <div className="whitespace-nowrap rounded-xl border border-white/15 bg-black/60 px-3 py-1.5 text-center text-[11px] backdrop-blur-md">
          <div className="font-bold" style={{ color: bar.color }}>{bar.label}</div>
          <div className="text-accent-soft text-sm font-mono">{bar.value} {bar.unit}</div>
        </div>
      </Html>
    </group>
  );
}

function EnergyScene({
  computed,
  simulationTime,
}: {
  computed: { bars: EnergyBar[] };
  simulationTime?: number;
}) {
  const bars = computed.bars || [];
  const maxVal = Math.max(...bars.map(b => Math.abs(b.value)), 1);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[30, 16]} />
        <meshStandardMaterial color="#0a0e18" metalness={0.4} roughness={0.6} />
      </mesh>
      <gridHelper args={[30, 30, "#1a2540", "#0d1220"]} position={[0, 0.01, 0]} />
      {bars.map((bar, i) => (
        <EnergyObject key={bar.label} bar={bar} index={i} total={bars.length} maxVal={maxVal} simulationTime={simulationTime} />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLISION — Pool table with billiard balls
// ═══════════════════════════════════════════════════════════════════════════

interface CollisionObj {
  label: string;
  mass_kg: number;
  velocity_m_s: number;
  final_velocity_m_s?: number;
  color: string;
}

function PoolTable() {
  return (
    <group>
      {/* Table top (green felt) */}
      <mesh position={[0, 0.75, 0]} receiveShadow>
        <boxGeometry args={[12, 0.15, 6]} />
        <meshStandardMaterial color="#0a6e2e" roughness={0.9} />
      </mesh>
      {/* Rails */}
      {[
        [0, 0.95, -3.1, 12.5, 0.25, 0.2],
        [0, 0.95, 3.1, 12.5, 0.25, 0.2],
        [-6.15, 0.95, 0, 0.2, 0.25, 6.4],
        [6.15, 0.95, 0, 0.2, 0.25, 6.4],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={`rail-${i}`} position={[x, y, z]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#5c2a0a" roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      {/* Legs */}
      {[[-5, -2.5], [-5, 2.5], [5, -2.5], [5, 2.5]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, 0.35, z]}>
          <cylinderGeometry args={[0.1, 0.12, 0.7, 12]} />
          <meshStandardMaterial color="#3a1a08" roughness={0.5} />
        </mesh>
      ))}
      {/* Pockets */}
      {[[-5.8, -2.8], [-5.8, 2.8], [0, -2.9], [0, 2.9], [5.8, -2.8], [5.8, 2.8]].map(([x, z], i) => (
        <mesh key={`pocket-${i}`} position={[x, 0.84, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
}

function BilliardBall({
  obj,
  index,
  totalObjs,
  simulationTime = 0,
}: {
  obj: CollisionObj;
  index: number;
  totalObjs: number;
  simulationTime?: number;
}) {
  const ref = useRef<Mesh>(null);
  const collisionTime = 2.5;
  const resetTime = 5.5;
  const radius = 0.2;
  const startX = index === 0 ? -4 : 3;

  useFrame(() => {
    if (!ref.current) return;
    const t = simulationTime % resetTime;

    let x: number;
    if (t < collisionTime) {
      x = startX + obj.velocity_m_s * 0.4 * t;
    } else {
      const dt = t - collisionTime;
      x = startX + obj.velocity_m_s * 0.4 * collisionTime + (obj.final_velocity_m_s ?? 0) * 0.4 * dt;
    }

    ref.current.position.set(x, 0.93, 0);
    ref.current.rotation.x = simulationTime * (obj.velocity_m_s > 0 ? 3 : -3);
  });

  return (
    <>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={obj.color}
          roughness={0.15}
          metalness={0.05}
          envMapIntensity={1.5}
        />
      </mesh>
      <Html position={[startX, 1.8, 0]} center distanceFactor={12}>
        <div className="whitespace-nowrap rounded-xl border border-white/15 bg-black/60 px-2.5 py-1 text-center text-[10px] backdrop-blur-md">
          <div className="font-bold" style={{ color: obj.color }}>{obj.label}</div>
          <div className="text-foreground-muted">{obj.mass_kg}kg · {obj.velocity_m_s}m/s</div>
        </div>
      </Html>
    </>
  );
}

function CollisionScene({
  computed,
  simulationTime,
}: {
  computed: { objects: CollisionObj[]; collision_type: string };
  simulationTime?: number;
}) {
  const objs = computed.objects || [];
  return (
    <>
      <PoolTable />
      {objs.map((o, i) => (
        <BilliardBall key={o.label} obj={o} index={i} totalObjs={objs.length} simulationTime={simulationTime} />
      ))}
      {/* Collision type label */}
      <Html position={[0, 2.5, 0]} center distanceFactor={14}>
        <div className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-mono text-accent-soft backdrop-blur-md">
          {computed.collision_type === "elastic" ? "ELASTIC · Kinetic energy conserved" : "INELASTIC · Objects stick together"}
        </div>
      </Html>
      {/* Ambient lighting for felt */}
      <pointLight position={[0, 4, 0]} color="#ffe8c0" intensity={4} distance={10} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ORBIT — Realistic solar system with textured planets
// ═══════════════════════════════════════════════════════════════════════════

interface OrbitBody {
  label: string;
  orbital_radius_au: number;
  period_years: number;
  color: string;
  size: number;
}

function OrbitingPlanet({ body, simulationTime = 0 }: { body: OrbitBody; simulationTime?: number }) {
  const ref = useRef<Mesh>(null);
  const trailRef = useRef<Group>(null);
  const radius = Math.min(body.orbital_radius_au * 2.8, 10);
  const period = Math.max(body.period_years * 3, 1);
  const planetSize = Math.min(Math.max(body.size * 0.06, 0.15), 0.8);

  const orbitPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);

  useFrame(() => {
    if (!ref.current) return;
    const t = simulationTime;
    const angle = (2 * Math.PI / period) * t;
    ref.current.position.x = Math.cos(angle) * radius;
    ref.current.position.z = Math.sin(angle) * radius;
    ref.current.position.y = 0;
    ref.current.rotation.y = t * 2;
  });

  return (
    <>
      <Line points={orbitPoints} color={body.color} lineWidth={1} transparent opacity={0.2} />
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[planetSize, 32, 32]} />
        <meshStandardMaterial
          color={body.color}
          emissive={body.color}
          emissiveIntensity={0.15}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      <Html position={[radius + 0.5, 1, 0]} center distanceFactor={14}>
        <div className="whitespace-nowrap rounded-xl border border-white/10 bg-black/60 px-2 py-1 text-[9px] backdrop-blur-md">
          <div className="font-bold" style={{ color: body.color }}>{body.label}</div>
          <div className="text-foreground-muted">{body.period_years}yr orbit</div>
        </div>
      </Html>
    </>
  );
}

function OrbitScene({
  computed,
  simulationTime,
}: {
  computed: { bodies: OrbitBody[] };
  simulationTime?: number;
}) {
  const bodies = computed.bodies || [];
  return (
    <>
      {/* Star field floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#020208" />
      </mesh>

      {/* Central star with glow layers */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#ffee44" emissive="#ffcc00" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.0, 24, 24]} />
        <meshStandardMaterial color="#ffcc00" transparent opacity={0.15} emissive="#ffaa00" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color="#ff8800" transparent opacity={0.05} emissive="#ff6600" emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 0, 0]} color="#ffdd44" intensity={8} distance={30} />

      {bodies.map((b) => (
        <OrbitingPlanet key={b.label} body={b} simulationTime={simulationTime} />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WAVE — Ocean-style animated waves with a beach/water vibe
// ═══════════════════════════════════════════════════════════════════════════

interface WaveData {
  label: string;
  frequency_hz: number;
  amplitude: number;
  wavelength_m: number;
  color: string;
}

function AnimatedWave({
  wave,
  index,
  total,
  simulationTime = 0,
}: {
  wave: WaveData;
  index: number;
  total: number;
  simulationTime?: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const zPos = (index - (total - 1) / 2) * 3;
  const segW = 80;
  const segH = 12;

  useFrame(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position;
    const t = simulationTime;
    const amp = wave.amplitude * 0.8;
    const freq = wave.frequency_hz * 0.4;
    const wl = Math.max(wave.wavelength_m * 0.3, 1);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = amp * Math.sin((2 * Math.PI / wl) * x - freq * t + z * 0.3);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <group position={[0, 1.5, zPos]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 3, segW, segH]} />
        <meshStandardMaterial
          color={wave.color}
          emissive={wave.color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
          transparent
          opacity={0.75}
        />
      </mesh>
      <Html position={[6, 1.5, 0]} center distanceFactor={12}>
        <div className="whitespace-nowrap rounded-xl border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] backdrop-blur-md">
          <div className="font-bold" style={{ color: wave.color }}>{wave.label}</div>
          <div className="text-foreground-muted">{wave.frequency_hz}Hz · λ={wave.wavelength_m}m</div>
        </div>
      </Html>
    </group>
  );
}

function WaveScene({
  computed,
  simulationTime,
}: {
  computed: { waves: WaveData[] };
  simulationTime?: number;
}) {
  const waves = computed.waves || [];
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[30, 20]} />
      <meshStandardMaterial color="#040810" />
      </mesh>
      {waves.map((w, i) => (
        <AnimatedWave key={w.label} wave={w} index={i} total={waves.length} simulationTime={simulationTime} />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SPRING — Realistic spring coils with bouncing masses
// ═══════════════════════════════════════════════════════════════════════════

interface SpringData {
  label: string;
  k_constant: number;
  mass_kg: number;
  period_s: number;
  color: string;
}

function SpringCoil({
  spring,
  index,
  total,
  simulationTime = 0,
}: {
  spring: SpringData;
  index: number;
  total: number;
  simulationTime?: number;
}) {
  const groupRef = useRef<Group>(null);
  const massRef = useRef<Mesh>(null);
  const spacing = 3;
  const x = (index - (total - 1) / 2) * spacing;
  const amplitude = 1.8;
  const ceilingY = 6;
  const restLen = 2.5;

  useFrame(() => {
    if (!groupRef.current || !massRef.current) return;
    const t = simulationTime;
    const displacement = amplitude * Math.cos((2 * Math.PI / spring.period_s) * t);
    const massY = ceilingY - restLen - 1 + displacement;
    massRef.current.position.y = massY;
  });

  const massSize = Math.cbrt(spring.mass_kg) * 0.25 + 0.2;

  return (
    <group ref={groupRef} position={[x, 0, 0]}>
      {/* Ceiling mount */}
      <mesh position={[0, ceilingY, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.5]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Spring coil visualization */}
      {Array.from({ length: 12 }).map((_, i) => {
        const frac = i / 11;
        const coilY = ceilingY - 0.2 - frac * restLen;
        const coilAngle = frac * Math.PI * 6;
        const coilR = 0.2;
        return (
          <mesh key={`coil-${i}`} position={[Math.cos(coilAngle) * coilR, coilY, Math.sin(coilAngle) * coilR]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.2} />
          </mesh>
        );
      })}

      {/* Mass block */}
      <mesh ref={massRef} position={[0, ceilingY - restLen - 1, 0]} castShadow>
        <boxGeometry args={[massSize, massSize, massSize]} />
        <meshStandardMaterial
          color={spring.color}
          emissive={spring.color}
          emissiveIntensity={0.2}
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>

      <Html position={[0, 0.5, 0]} center distanceFactor={11}>
        <div className="whitespace-nowrap rounded-xl border border-white/15 bg-black/60 px-2.5 py-1 text-center text-[10px] backdrop-blur-md">
          <div className="font-bold" style={{ color: spring.color }}>{spring.label}</div>
          <div className="text-foreground-muted">{spring.mass_kg}kg · k={spring.k_constant}N/m</div>
          <div className="text-foreground-muted">T={spring.period_s}s</div>
        </div>
      </Html>
    </group>
  );
}

function SpringScene({
  computed,
  simulationTime,
}: {
  computed: { springs: SpringData[] };
  simulationTime?: number;
}) {
  const springs = computed.springs || [];
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[24, 16]} />
        <meshStandardMaterial color="#1a1a25" metalness={0.3} roughness={0.7} />
      </mesh>
      <gridHelper args={[24, 24, "#2a2a3a", "#151520"]} position={[0, 0.01, 0]} />

      {/* Ceiling */}
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[springs.length * 3 + 2, 0.2, 3]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
      </mesh>

      {springs.map((s, i) => (
        <SpringCoil key={s.label} spring={s} index={i} total={springs.length} simulationTime={simulationTime} />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main dispatcher
// ═══════════════════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */
const SCENE_MAP: Record<string, React.ComponentType<{ computed: any; simulationTime?: number; timelineDuration?: number }>> = {
  projectile: ProjectileScene,
  pendulum: PendulumScene,
  energy_comparison: EnergyScene,
  collision: CollisionScene,
  orbit: OrbitScene,
  wave: WaveScene,
  spring: SpringScene,
};

const CAMERA_MAP: Record<string, [number, number, number]> = {
  projectile: [0, 6, 18],
  pendulum: [0, 3, 14],
  energy_comparison: [0, 5, 16],
  collision: [2, 4, 10],
  orbit: [4, 8, 16],
  wave: [0, 5, 12],
  spring: [0, 3.5, 14],
};

interface DynamicViewerProps {
  payload: DynamicPayload;
  journeyActive?: boolean;
  currentWaypoint?: JourneyWaypoint | null;
  simulationPaused?: boolean;
  simulationTime?: number;
}

export function DynamicViewer({ payload, journeyActive, currentWaypoint, simulationPaused, simulationTime = 0 }: DynamicViewerProps) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const simType = (payload as any).sim_type || "energy_comparison";
  const computed = (payload as any).computed || {};
  const equation = (payload as any).equation;
  const timelineDuration = useMemo(() => {
    const waypoints = ((payload as any).journey_waypoints as JourneyWaypoint[] | undefined) ?? [];
    return waypoints.length > 0 ? Math.max(...waypoints.map((waypoint) => waypoint.time), 12) : 12;
  }, [payload]);

  const SceneComponent = SCENE_MAP[simType] || EnergyScene;
  const cameraPos = CAMERA_MAP[simType] || [0, 4, 14];

  const equationStr = equation?.formula || undefined;
  const badges = useMemo(() => {
    const b: string[] = [];
    if (payload.takeaway) b.push(payload.takeaway);
    return b;
  }, [payload.takeaway]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <SceneStage
        cameraPosition={cameraPos}
        fov={50}
        maxDistance={35}
        minDistance={4}
        autoRotateSpeed={journeyActive ? 0 : 0.12}
        disableOrbitControls={!!journeyActive}
      >
        <SceneComponent computed={computed} simulationTime={simulationTime} timelineDuration={timelineDuration} />
        {simulationPaused !== undefined && <ClockController paused={!!simulationPaused} />}
        {journeyActive && currentWaypoint && (
          <JourneyCamera
            targetPosition={currentWaypoint.cameraPos}
            targetLookAt={currentWaypoint.cameraTarget}
            active={true}
          />
        )}
      </SceneStage>

      {/* Minimal top-left title in journey mode, full header otherwise */}
      {journeyActive ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-foreground/90">{payload.title}</h3>
            {equationStr && (
              <span className="font-mono text-[11px] text-accent-soft">{equationStr}</span>
            )}
          </div>
        </div>
      ) : (
        <StageHeader title={payload.title} equation={equationStr} badges={badges} />
      )}

      {!journeyActive && equation && equation.label && (
        <div className="absolute bottom-4 right-4 z-10 max-w-xs">
          <div className="glass-panel rounded-xl border border-white/10 px-3 py-2 text-xs">
            <div className="font-semibold text-foreground">{equation.label}</div>
            <div className="font-mono text-accent-soft">{equation.formula}</div>
            <div className="text-foreground-muted mt-0.5">{equation.explanation}</div>
          </div>
        </div>
      )}
    </div>
  );
}
