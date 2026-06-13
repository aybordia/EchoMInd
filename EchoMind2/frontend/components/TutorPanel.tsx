"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Sparkles, Volume2, VolumeX } from "lucide-react";
import { resolveAssetUrl } from "@/lib/api";
import { isSpeechSynthesisSupported, speak, stopSpeaking } from "@/lib/speech";
import type { SimulationPayload, TeachingResult } from "@/lib/types";

function getEquation(simulation: SimulationPayload): string | undefined {
  switch (simulation.type) {
    case "planet_jump":
    case "moon_drop":
      return simulation.equation;
    default:
      return undefined;
  }
}

interface TutorPanelProps {
  teaching: TeachingResult;
  simulation: SimulationPayload;
  onFollowup: (question: string) => void;
  onGiveFeedback: () => void;
}

export function TutorPanel({ teaching, simulation, onFollowup, onGiveFeedback }: TutorPanelProps) {
  const [speaking, setSpeaking] = useState(false);
  const audioUrl = resolveAssetUrl(teaching.audio_url);
  const equation = getEquation(simulation);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(teaching.transcript, { onEnd: () => setSpeaking(false) });
    setSpeaking(true);
  }

  return (
    <div className="glass-panel-strong flex h-full flex-col gap-4 overflow-y-auto p-5 sm:p-6">
      <div className="space-y-1">
        <span className="text-xs font-medium uppercase tracking-wider text-accent-soft">
          Key takeaway
        </span>
        <p className="text-lg font-semibold leading-snug text-foreground">
          {teaching.key_takeaway}
        </p>
      </div>

      {equation && teaching.visual_style_instructions.equation_card && (
        <div className="glow-warm rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 font-mono text-sm text-accent-soft">
          {equation}
        </div>
      )}

      <p className="text-sm leading-relaxed text-foreground-muted">{teaching.transcript}</p>

      {teaching.misconceptions_corrected.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-accent-cool/20 bg-accent-cool/5 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-cool-soft" />
          <div>
            <div className="font-semibold text-accent-cool-soft">Misconception corrected</div>
            {teaching.misconceptions_corrected.map((m) => (
              <p key={m} className="mt-1 text-foreground-muted">
                {m}
              </p>
            ))}
          </div>
        </div>
      )}

      {teaching.concepts_explained.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {teaching.concepts_explained.map((concept) => (
            <span
              key={concept}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground-muted"
            >
              {concept}
            </span>
          ))}
        </div>
      )}

      {teaching.adaptation_note && (
        <p className="flex items-center gap-2 text-xs italic text-foreground-subtle">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-soft" />
          {teaching.adaptation_note}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
        {audioUrl ? (
          <audio controls src={audioUrl} className="h-9 max-w-full flex-1" />
        ) : isSpeechSynthesisSupported() ? (
          <button
            type="button"
            onClick={toggleSpeak}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
          >
            {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {speaking ? "Stop" : "Read aloud"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onGiveFeedback}
          className="ml-auto rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
        >
          Rate this explanation
        </button>
      </div>

      {teaching.followups.length > 0 && (
        <div className="space-y-2 border-t border-white/5 pt-4">
          <span className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
            Try next
          </span>
          <div className="flex flex-col gap-2">
            {teaching.followups.map((followup) => (
              <button
                key={followup}
                type="button"
                onClick={() => onFollowup(followup)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-accent/30 hover:bg-accent/5"
              >
                {followup}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
