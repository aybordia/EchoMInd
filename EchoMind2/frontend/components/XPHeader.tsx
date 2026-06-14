"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getGameState } from "@/lib/api";
import type { GameState } from "@/lib/types";

function nextLevelTarget(level: number): number {
  return level * level * 100;
}

export function XPHeader({
  userId,
  initialState,
}: {
  userId?: string | null;
  initialState?: GameState | null;
}) {
  const [state, setState] = useState<GameState | null>(null);
  const displayState = initialState ?? state;

  useEffect(() => {
    if (!userId || initialState) return;
    let cancelled = false;
    getGameState(userId)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialState, userId]);

  if (!displayState) return null;

  const target = nextLevelTarget(displayState.level);
  const previous = Math.max(0, (displayState.level - 1) * (displayState.level - 1) * 100);
  const progress = Math.min(100, ((displayState.xp_total - previous) / Math.max(1, target - previous)) * 100);

  return (
    <div className="min-w-[152px] rounded-full border border-accent/20 bg-accent/8 px-3 py-1.5 shadow-[0_0_28px_rgba(255,157,77,0.12)]">
      <div className="flex items-center gap-2 text-xs font-semibold text-accent-soft">
        <Sparkles className="h-3.5 w-3.5" />
        Level {displayState.level} · {displayState.xp_total} XP
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
