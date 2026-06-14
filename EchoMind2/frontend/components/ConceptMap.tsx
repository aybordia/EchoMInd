"use client";

import type { ConceptMastery } from "@/lib/types";

const CONCEPTS = [
  "Gravity",
  "Friction",
  "Normal Force",
  "Air Resistance",
  "Momentum",
  "Molecular Bonds",
  "Charge Attraction",
  "Energy",
  "Digital Twins",
  "Scientific Prediction",
];

export function ConceptMap({ mastery }: { mastery: Record<string, ConceptMastery> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CONCEPTS.map((concept) => {
        const node = mastery[concept];
        const progress = node?.progress ?? 0;
        return (
          <div
            key={concept}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_28px_rgba(125,211,252,0.04)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-foreground">{concept}</div>
              <div className="text-xs text-accent-soft">{progress}%</div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-cool to-accent"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs capitalize text-foreground-muted">
              {node?.status ?? "unseen"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
