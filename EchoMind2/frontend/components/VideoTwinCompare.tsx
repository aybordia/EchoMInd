"use client";

import { Film, Sparkles } from "lucide-react";
import type { RampBoxPayload } from "@/lib/types";
import { SimulationViewer } from "./SimulationViewer";

interface VideoTwinCompareProps {
  videoUrl: string;
  payload: RampBoxPayload;
}

/** Side-by-side comparison of the uploaded footage and EchoMind's reconstructed 3D twin. */
export function VideoTwinCompare({ videoUrl, payload }: VideoTwinCompareProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="glass-panel-strong space-y-2 p-3">
        <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
          <Film className="h-3.5 w-3.5" />
          Your video
        </div>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <video controls src={videoUrl} className="h-full w-full" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-accent-soft">
          <Sparkles className="h-3.5 w-3.5" />
          EchoMind&apos;s digital twin
        </div>
        <div className="relative aspect-video overflow-hidden rounded-3xl">
          <SimulationViewer simulation={payload} />
        </div>
      </div>
    </div>
  );
}
