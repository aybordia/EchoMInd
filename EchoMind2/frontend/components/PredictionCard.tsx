"use client";

import { useState } from "react";
import { Brain, CheckCircle2, XCircle } from "lucide-react";
import type { PredictionSubmitResponse } from "@/lib/types";

export function PredictionCard({
  prompt,
  options,
  result,
  loading,
  onSubmit,
  onContinue,
}: {
  prompt: string;
  options: string[];
  result?: PredictionSubmitResponse | null;
  loading?: boolean;
  onSubmit: (answer: string) => void;
  onContinue: () => void;
}) {
  const [selected, setSelected] = useState("");

  return (
    <div className="rounded-[1.5rem] border border-accent/20 bg-accent/8 p-5 shadow-[0_0_42px_rgba(255,157,77,0.08)]">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-soft">
        <Brain className="h-4 w-4" />
        Prediction Challenge
      </div>
      <h3 className="text-lg font-semibold text-foreground">{prompt}</h3>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={Boolean(result) || loading}
            onClick={() => setSelected(option)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
              selected === option
                ? "border-accent/50 bg-accent/15 text-foreground"
                : "border-white/10 bg-white/5 text-foreground-muted hover:border-white/20 hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {result ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className={`mb-1 flex items-center gap-2 text-sm font-semibold ${result.correct ? "text-emerald-300" : "text-amber-200"}`}>
            {result.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {result.correct ? "Correct prediction" : `Not quite: ${result.correct_answer}`}
          </div>
          <p className="text-sm text-foreground-muted">{result.explanation}</p>
          <button
            type="button"
            onClick={onContinue}
            className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Reveal simulation
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!selected || loading}
          onClick={() => onSubmit(selected)}
          className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Checking..." : "Lock in prediction"}
        </button>
      )}
    </div>
  );
}
