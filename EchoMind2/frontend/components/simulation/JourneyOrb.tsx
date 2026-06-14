"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

export interface JourneyWaypoint {
  id: string;
  time: number;
  label: string;
  narration: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  audio_url?: string;
}

interface JourneyOrbProps {
  waypoints: JourneyWaypoint[];
  currentWaypointIndex: number;
  isPlaying: boolean;
  isSpeaking: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoToWaypoint: (index: number) => void;
}

export function JourneyOrb({
  waypoints,
  currentWaypointIndex,
  isPlaying,
  isSpeaking,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onGoToWaypoint,
}: JourneyOrbProps) {
  const currentWaypoint = waypoints[currentWaypointIndex];
  const progress = waypoints.length > 1 ? currentWaypointIndex / (waypoints.length - 1) : 0;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-3">
      {/* Narration bubble */}
      {currentWaypoint && (
        <div className="max-w-[280px] rounded-2xl border border-white/8 bg-black/60 px-4 py-3 backdrop-blur-2xl">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-accent-soft">
            {currentWaypoint.label}
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/85">
            {currentWaypoint.narration}
          </p>
        </div>
      )}

      {/* Orb + controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentWaypointIndex === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted transition-all hover:text-foreground disabled:opacity-20"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>

        {/* The Orb */}
        <div className="relative">
          <div
            className={`absolute -inset-3 rounded-full blur-xl transition-all duration-700 ${
              isSpeaking
                ? "animate-pulse bg-gradient-to-br from-orange-500/35 to-amber-500/35"
                : "bg-gradient-to-br from-blue-500/15 to-purple-500/15"
            }`}
          />
          <button
            type="button"
            onClick={isPlaying ? onPause : onPlay}
            className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${
              isSpeaking ? "animate-[orb-speak_0.9s_ease-in-out_infinite]" : ""
            }`}
            style={{
              background: isSpeaking
                ? "radial-gradient(circle at 35% 35%, #ff9d4d, #e86c1a 55%, #b04a0a)"
                : "radial-gradient(circle at 35% 35%, #7dd3fc, #3b82f6 55%, #1d4ed8)",
              boxShadow: isSpeaking
                ? "0 0 24px rgba(232,108,26,0.35), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.2)"
                : "0 0 20px rgba(59,130,246,0.3), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.2)",
            }}
          >
            <div
              className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)" }}
            />
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white drop-shadow-sm" />
            ) : (
              <Play className="h-4 w-4 translate-x-[1px] text-white drop-shadow-sm" />
            )}
          </button>

          {/* Progress ring */}
          <svg className="pointer-events-none absolute -inset-0.5 h-[calc(100%+4px)] w-[calc(100%+4px)]" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
            <circle
              cx="28" cy="28" r="26" fill="none"
              stroke="url(#orbGrad)" strokeWidth="2" strokeLinecap="round"
              strokeDasharray={`${progress * 163.4} 163.4`}
              transform="rotate(-90 28 28)"
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="orbGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={currentWaypointIndex === waypoints.length - 1}
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted transition-all hover:text-foreground disabled:opacity-20"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Waypoint dots */}
      <div className="flex items-center gap-1">
        {waypoints.map((wp, i) => (
          <button
            type="button"
            key={wp.id}
            onClick={() => onGoToWaypoint(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentWaypointIndex
                ? "w-5 bg-accent"
                : i < currentWaypointIndex
                  ? "w-1.5 bg-accent/40"
                  : "w-1.5 bg-white/15"
            }`}
            title={wp.label}
          />
        ))}
      </div>
    </div>
  );
}
