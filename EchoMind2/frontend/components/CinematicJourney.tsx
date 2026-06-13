"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { resolveAssetUrl } from "@/lib/api";
import { speak, stopSpeaking } from "@/lib/speech";
import type { JourneyBeat } from "@/lib/types";

interface CinematicJourneyProps {
  beats: JourneyBeat[];
  /** Notifies the scene which element to spotlight for the active beat. */
  onFocusChange?: (focus: string | null) => void;
  /** Notifies when the whole tour finishes (e.g. to surface feedback). */
  onComplete?: () => void;
}

/** Estimated narration time for a line when no audio clip is available. */
function readingMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2800, Math.round(words * 380));
}

/**
 * Guided narrated tour overlaid on the simulation. Steps through the tutor's
 * beats one at a time, speaking each (ElevenLabs clip if present, else browser
 * TTS), pausing on each step, and reporting the focus so the scene can spotlight
 * the relevant element. Play / pause / next / prev / replay are all manual too.
 */
export function CinematicJourney({ beats, onFocusChange, onComplete }: CinematicJourneyProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    stopSpeaking();
  }, []);

  const goTo = useCallback(
    (next: number) => {
      clearTimers();
      const clamped = Math.max(0, Math.min(beats.length - 1, next));
      setIndex(clamped);
      setDone(false);
    },
    [beats.length, clearTimers]
  );

  // Drive the active beat whenever it changes (and we're playing).
  useEffect(() => {
    if (!playing || beats.length === 0) return;
    const beat = beats[index];
    onFocusChange?.(beat.focus ?? null);
    advancedRef.current = false;

    const advance = () => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      if (index >= beats.length - 1) {
        setPlaying(false);
        setDone(true);
        onFocusChange?.("overview");
        onComplete?.();
      } else {
        setIndex((i) => i + 1);
      }
    };

    // Safety timer guarantees progression even with no audio device (headless).
    const safetyMs = readingMs(beat.text) + 600;
    timerRef.current = setTimeout(advance, safetyMs);

    const clipUrl = resolveAssetUrl(beat.audio_url);
    if (clipUrl) {
      const audio = new Audio(clipUrl);
      audioRef.current = audio;
      audio.onended = advance;
      void audio.play().catch(() => {
        // autoplay blocked -> browser TTS as fallback narration
        speak(beat.text, { onEnd: advance });
      });
    } else {
      speak(beat.text, { onEnd: advance });
    }

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing, beats]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (beats.length === 0) return null;
  const beat = beats[index];
  const progress = ((index + 1) / beats.length) * 100;

  function togglePlay() {
    if (done) {
      setIndex(0);
      setDone(false);
      setPlaying(true);
      return;
    }
    setPlaying((p) => {
      if (p) clearTimers();
      return !p;
    });
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-xl">
        {/* progress */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-foreground-subtle">
            {index + 1}/{beats.length}
          </span>
        </div>

        {/* caption */}
        <p className="min-h-[3.5rem] text-center text-base font-medium leading-snug text-foreground sm:text-lg">
          {beat.text}
        </p>

        {/* controls */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-background shadow-lg transition-transform hover:scale-105"
            aria-label={playing ? "Pause" : "Play"}
          >
            {done ? (
              <RotateCcw className="h-5 w-5" />
            ) : playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= beats.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground-muted transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
