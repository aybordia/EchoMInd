"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

interface AgentTimelineProps {
  stages: string[];
  onComplete?: () => void;
  stepDurationMs?: number;
  /** While true, playback pauses on the final stage instead of completing. */
  waitingForResult?: boolean;
}

/**
 * Animates through the agent's pipeline stages. The backend already ran the
 * full pipeline synchronously, so this is a deliberate playback that lets the
 * user "watch the agent think" before the result reveals. If the response is
 * still pending once playback reaches the final stage, it holds there (the
 * final icon keeps spinning) until `waitingForResult` becomes false.
 */
export function AgentTimeline({
  stages,
  onComplete,
  stepDurationMs = 420,
  waitingForResult = false,
}: AgentTimelineProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= stages.length) {
      onComplete?.();
      return;
    }
    if (activeIndex === stages.length - 1 && waitingForResult) {
      return;
    }
    const timer = setTimeout(() => setActiveIndex((i) => i + 1), stepDurationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, stages.length, stepDurationMs, waitingForResult]);

  return (
    <div className="glass-panel space-y-2 p-4 sm:p-5">
      {stages.map((stage, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: isDone || isActive ? 1 : 0.35, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 text-sm"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                isDone
                  ? "border-success/40 bg-success/15 text-success"
                  : isActive
                    ? "border-accent/40 bg-accent/15 text-accent-soft"
                    : "border-white/10 bg-white/5 text-foreground-subtle"
              }`}
            >
              {isDone ? (
                <Check className="h-3.5 w-3.5" />
              ) : isActive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
            </span>
            <span className={isDone || isActive ? "text-foreground" : "text-foreground-subtle"}>
              {stage}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
