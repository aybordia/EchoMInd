"use client";

import type { SimulationPayload } from "@/lib/types";
import { DiagramOverlay } from "./simulation/DiagramOverlay";
import { DynamicViewer } from "./simulation/DynamicViewer";
import { MoleculeViewer } from "./simulation/MoleculeViewer";
import { MoonDropViewer } from "./simulation/MoonDropViewer";
import { PlanetJumpViewer } from "./simulation/PlanetJumpViewer";
import { RampBoxViewer } from "./simulation/RampBoxViewer";
import type { JourneyWaypoint } from "./simulation/JourneyOrb";

interface SimulationViewerProps {
  simulation: SimulationPayload;
  activeFocus?: string | null;
  journeyActive?: boolean;
  currentWaypoint?: JourneyWaypoint | null;
  simulationPaused?: boolean;
  simulationTime?: number;
}

export function SimulationViewer({
  simulation,
  activeFocus,
  journeyActive,
  currentWaypoint,
  simulationPaused,
  simulationTime,
}: SimulationViewerProps) {
  switch (simulation.type) {
    case "planet_jump":
      return <PlanetJumpViewer payload={simulation} activeFocus={activeFocus} />;
    case "moon_drop":
      return <MoonDropViewer payload={simulation} />;
    case "molecule_interaction":
      return <MoleculeViewer payload={simulation} />;
    case "ramp_box":
      return <RampBoxViewer payload={simulation} />;
    case "dynamic":
      return (
        <DynamicViewer
          payload={simulation}
          journeyActive={journeyActive}
          currentWaypoint={currentWaypoint}
          simulationPaused={simulationPaused}
          simulationTime={simulationTime}
        />
      );
    case "fallback_diagram":
    default:
      return <DiagramOverlay payload={simulation} />;
  }
}
