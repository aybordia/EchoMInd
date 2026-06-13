"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function ClockController({ paused }: { paused: boolean }) {
  const { clock } = useThree();

  useEffect(() => {
    if (paused) {
      clock.stop();
    } else {
      clock.start();
    }
  }, [paused, clock]);

  return null;
}
