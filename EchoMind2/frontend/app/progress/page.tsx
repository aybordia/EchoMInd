"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, FlaskConical, Sparkles, Target } from "lucide-react";
import { ConceptMap } from "@/components/ConceptMap";
import { NavBar } from "@/components/NavBar";
import { XPHeader } from "@/components/XPHeader";
import { getGameState } from "@/lib/api";
import { getAuthUserId, useAuthSession } from "@/lib/auth-client";
import type { GameState } from "@/lib/types";

export default function ProgressPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <ProgressContent />
    </div>
  );
}

function ProgressContent() {
  const { data, status } = useAuthSession();
  const userId = getAuthUserId(data);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getGameState(userId)
      .then(setState)
      .catch(() => setError("Could not load progress right now."));
  }, [userId]);

  if (status === "loading" || (userId && !state && !error)) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-foreground-muted">
        Loading progress...
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold text-foreground">Sign in to view progress</h1>
        <p className="max-w-xl text-sm text-foreground-muted">
          EchoMind needs a learner profile before it can show XP, badges, predictions, and concept mastery.
        </p>
        <Link
          href="/auth?callbackUrl=%2Fprogress"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </main>
    );
  }

  if (error || !state) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
          {error}
        </div>
      </main>
    );
  }

  const attempts = Number(state.prediction_stats?.attempts ?? 0);
  const correct = Number(state.prediction_stats?.correct ?? 0);
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-soft">
            <Sparkles className="h-4 w-4" />
            Science Progress
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Your curiosity map</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
            EchoMind turns questions, predictions, simulations, and feedback into visible progress.
          </p>
        </div>
        <XPHeader userId={userId} initialState={state} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4 text-accent-soft" />
            Prediction Accuracy
          </div>
          <div className="text-3xl font-semibold text-foreground">{accuracy}%</div>
          <p className="mt-1 text-sm text-foreground-muted">{correct}/{attempts} predictions correct</p>
        </div>
        <div className="glass-panel p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Award className="h-4 w-4 text-accent-soft" />
            Badges
          </div>
          <div className="text-3xl font-semibold text-foreground">{state.badges.length}</div>
          <p className="mt-1 text-sm text-foreground-muted">Misconceptions corrected and milestones earned</p>
        </div>
        <div className="glass-panel p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FlaskConical className="h-4 w-4 text-accent-soft" />
            Lab Tools
          </div>
          <div className="text-3xl font-semibold text-foreground">{state.unlocked_tools.length}</div>
          <p className="mt-1 text-sm text-foreground-muted">Optional controls unlocked by mastery</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Concept Mastery</h2>
        <ConceptMap mastery={state.concept_mastery} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel-strong p-5">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Badges</h2>
          <div className="space-y-3">
            {state.badges.length ? state.badges.map((badge) => (
              <div key={badge.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-foreground">{badge.name}</div>
                <p className="text-sm text-foreground-muted">{badge.description}</p>
              </div>
            )) : (
              <p className="text-sm text-foreground-muted">Run a simulation and make a prediction to earn your first badge.</p>
            )}
          </div>
        </div>

        <div className="glass-panel-strong p-5">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Unlocked Lab Tools</h2>
          <div className="space-y-3">
            {state.unlocked_tools.length ? state.unlocked_tools.map((tool) => (
              <div key={tool.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-foreground">{tool.name}</div>
                <p className="text-sm text-foreground-muted">{tool.description}</p>
              </div>
            )) : (
              <p className="text-sm text-foreground-muted">Master concepts to unlock extra lab controls.</p>
            )}
          </div>
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Recent XP</h2>
        <div className="space-y-2">
          {state.xp_events.slice(-8).reverse().map((event, index) => (
            <div key={`${event.timestamp}-${index}`} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="capitalize text-foreground-muted">{event.type.replaceAll("_", " ")}</span>
              <span className="font-semibold text-accent-soft">+{event.amount} XP</span>
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/ask"
        className="self-start rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Ask another question
      </Link>
    </main>
  );
}
