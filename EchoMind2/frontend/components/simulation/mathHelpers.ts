import type { PlanetJumpKeyframe, RampBoxTrajectoryPoint } from "@/lib/types";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Sample a `{ t, y }` keyframe list (sorted by t), clamping at the ends. */
export function sampleKeyframes(keyframes: PlanetJumpKeyframe[], time: number): number {
  if (keyframes.length === 0) return 0;
  if (time <= keyframes[0].t) return keyframes[0].y;
  const last = keyframes[keyframes.length - 1];
  if (time >= last.t) return last.y;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (time >= a.t && time <= b.t) {
      const span = b.t - a.t;
      const localT = span === 0 ? 0 : (time - a.t) / span;
      return lerp(a.y, b.y, localT);
    }
  }
  return last.y;
}

/** Sample a `{ t, distance_m }` trajectory list, clamping at the ends. */
export function sampleTrajectory(trajectory: RampBoxTrajectoryPoint[], time: number): number {
  if (trajectory.length === 0) return 0;
  if (time <= trajectory[0].t) return trajectory[0].distance_m;
  const last = trajectory[trajectory.length - 1];
  if (time >= last.t) return last.distance_m;

  for (let i = 0; i < trajectory.length - 1; i++) {
    const a = trajectory[i];
    const b = trajectory[i + 1];
    if (time >= a.t && time <= b.t) {
      const span = b.t - a.t;
      const localT = span === 0 ? 0 : (time - a.t) / span;
      return lerp(a.distance_m, b.distance_m, localT);
    }
  }
  return last.distance_m;
}

/** Smooth 0 -> 1 -> 0 oscillation with period `2 * duration` seconds. */
export function pingPong(elapsed: number, duration: number): number {
  if (duration <= 0) return 0;
  const phase = (elapsed % (duration * 2)) / duration;
  const t = phase <= 1 ? phase : 2 - phase;
  return (1 - Math.cos(t * Math.PI)) / 2;
}
