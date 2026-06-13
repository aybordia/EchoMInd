"use client";

import type { SimulationPayload } from "@/lib/types";
import { DiagramOverlay } from "./simulation/DiagramOverlay";
import { MoleculeViewer } from "./simulation/MoleculeViewer";
import { MoonDropViewer } from "./simulation/MoonDropViewer";
import { PlanetJumpViewer } from "./simulation/PlanetJumpViewer";
import { RampBoxViewer } from "./simulation/RampBoxViewer";

/** Dispatches to the right 3D viewer (or 2D diagram) based on `simulation.type`. */
export function SimulationViewer({
  simulation,
  activeFocus,
}: {
  simulation: SimulationPayload;
  activeFocus?: string | null;
}) {
  switch (simulation.type) {
    case "planet_jump":
      return <PlanetJumpViewer payload={simulation} activeFocus={activeFocus} />;
    case "moon_drop":
      return <MoonDropViewer payload={simulation} />;
    case "molecule_interaction":
      return <MoleculeViewer payload={simulation} />;
    case "ramp_box":
      return <RampBoxViewer payload={simulation} />;
    case "fallback_diagram":
    default:
      return <DiagramOverlay payload={simulation} />;
  }
}
