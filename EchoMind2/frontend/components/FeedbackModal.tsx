"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, X } from "lucide-react";
import { submitFeedback } from "@/lib/api";
import { FEEDBACK_CHIPS } from "@/lib/types";

const CHIP_LABELS: Record<string, string> = {
  more_visuals: "More visuals",
  more_equations: "More equations",
  less_math: "Less math",
  too_fast: "Too fast",
  too_slow: "Too slow",
  more_realistic: "More realistic",
  better_voice: "Better voice",
  show_equation_next: "Show equation next time",
};

interface FeedbackModalProps {
  jobId: string;
  sessionId: string;
  userId: string;
  onClose: () => void;
  presentationMetrics?: Record<string, unknown>;
}

export function FeedbackModal({
  jobId,
  sessionId,
  userId,
  onClose,
  presentationMetrics,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [chips, setChips] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adaptation, setAdaptation] = useState<string | null>(null);

  function toggleChip(chip: string) {
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }

  async function handleSubmit() {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitFeedback({
        job_id: jobId,
        session_id: sessionId,
        user_id: userId,
        rating,
        chips,
        free_text: freeText,
        presentation_metrics: presentationMetrics,
      });
      setAdaptation(res.next_adaptation);
    } catch {
      setAdaptation("Thanks for the feedback!");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass-panel-strong relative w-full max-w-md space-y-5 p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground-subtle transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {adaptation ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-gradient-warm text-lg font-semibold">Thanks!</p>
            <p className="text-sm text-foreground-muted">{adaptation}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/settings"
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Review learning settings
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold text-foreground">How was this explanation?</h3>
              <p className="text-sm text-foreground-muted">
                Your rating helps EchoMind adapt future lessons.
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="transition-transform hover:scale-110"
                  aria-label={`Rate ${value} out of 5`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      value <= rating ? "fill-accent text-accent" : "text-foreground-subtle"
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && rating <= 3 ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-accent-soft">
                    Help EchoMind improve this experience
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleChip(chip)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          chips.includes(chip)
                            ? "border-accent/40 bg-accent/15 text-accent-soft"
                            : "border-white/10 bg-white/5 text-foreground-muted hover:border-white/20"
                        }`}
                      >
                        {CHIP_LABELS[chip] ?? chip}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="What felt off, rushed, confusing, or missing?"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-accent/30 focus:outline-none"
                />
              </>
            ) : rating >= 4 ? (
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
                Great — EchoMind will keep leaning into this teaching style. You can still add an optional note below.
              </div>
            ) : null}

            {rating >= 4 ? (
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Optional: what worked especially well?"
                rows={2}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-accent/30 focus:outline-none"
              />
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Submit feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
