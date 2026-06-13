"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Mic, Pause, Play } from "lucide-react";
import { listVoices } from "@/lib/api";
import type { Voice } from "@/lib/types";

const LS_VOICE_ID = "echomind_voice_id";
const LS_VOICE_LABEL = "echomind_voice_label";

interface VoicePickerProps {
  voiceId: string | null;
  onChange: (voiceId: string | null, voiceLabel: string | null) => void;
}

/** ElevenLabs-style voice picker: lists available voices (incl. the account's
 *  own custom voices), previews each, and persists the choice. */
export function VoicePicker({ voiceId, onChange }: VoicePickerProps) {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listVoices()
      .then((vs) => {
        if (cancelled) return;
        setVoices(vs);
        // Restore persisted choice, else default to the first real voice.
        const savedId = typeof window !== "undefined" ? localStorage.getItem(LS_VOICE_ID) : null;
        if (savedId && vs.some((v) => v.voice_id === savedId)) {
          const v = vs.find((x) => x.voice_id === savedId)!;
          onChange(v.voice_id, v.name);
        } else if (!voiceId && vs.length > 0) {
          const first = vs.find((v) => v.category !== "fallback") ?? vs[0];
          onChange(first.voice_id, first.name);
        }
      })
      .catch(() => setVoices([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(v: Voice) {
    onChange(v.voice_id, v.name);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_VOICE_ID, v.voice_id);
      localStorage.setItem(LS_VOICE_LABEL, v.name);
    }
    setOpen(false);
  }

  function togglePreview(v: Voice, e: React.MouseEvent) {
    e.stopPropagation();
    if (!v.preview_url) return;
    if (playingId === v.voice_id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(v.preview_url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    void audio.play().catch(() => setPlayingId(null));
    setPlayingId(v.voice_id);
  }

  const current = voices.find((v) => v.voice_id === voiceId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-foreground-muted transition-colors hover:border-accent/30 hover:text-foreground"
      >
        <Mic className="h-4 w-4 text-accent" />
        <span className="max-w-[10rem] truncate">
          {loading ? "Loading voices…" : current ? current.name : "Choose a voice"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 max-h-80 w-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0e16]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-foreground-subtle">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading voices…
            </div>
          )}
          {!loading && voices.length === 0 && (
            <div className="px-3 py-3 text-sm text-foreground-subtle">
              No voices available. The browser voice will be used.
            </div>
          )}
          {voices.map((v) => (
            <button
              key={v.voice_id}
              type="button"
              onClick={() => select(v)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/5 ${
                v.voice_id === voiceId ? "bg-accent/10" : ""
              }`}
            >
              {v.preview_url ? (
                <span
                  onClick={(e) => togglePreview(v, e)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-accent hover:border-accent/40"
                >
                  {playingId === v.voice_id ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </span>
              ) : (
                <span className="h-7 w-7 shrink-0" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{v.name}</span>
                {v.style_label && (
                  <span className="block truncate text-xs text-foreground-subtle">
                    {v.style_label}
                  </span>
                )}
              </span>
              {v.voice_id === voiceId && <Check className="h-4 w-4 shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
