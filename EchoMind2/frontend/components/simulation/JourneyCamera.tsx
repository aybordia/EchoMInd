"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface JourneyCameraProps {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
  active: boolean;
  speed?: number;
}

export function JourneyCamera({
  targetPosition,
  targetLookAt,
  active,
  speed = 1.8,
}: JourneyCameraProps) {
  const { camera } = useThree();
  const lookAtTarget = useRef(new THREE.Vector3(...targetLookAt));

  useFrame((_, delta) => {
    if (!active) return;

    const lerpFactor = 1 - Math.exp(-speed * delta);

    camera.position.lerp(
      new THREE.Vector3(...targetPosition),
      lerpFactor
    );

    lookAtTarget.current.lerp(
      new THREE.Vector3(...targetLookAt),
      lerpFactor
    );

    camera.lookAt(lookAtTarget.current);
  });

  return null;
}
