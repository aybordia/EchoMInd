"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brain, Settings2, Sparkles, User2 } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { NavBar } from "@/components/NavBar";
import { getMemory } from "@/lib/api";
import { hasCompletedOnboarding, useEchoSession } from "@/lib/session";
import type { MemorySummary } from "@/lib/types";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <AuthGate>
        <SettingsContent />
      </AuthGate>
    </div>
  );
}

function SettingsContent() {
  const { userId, authEmail, authUserId, loading } = useEchoSession();
  const [memory, setMemory] = useState<MemorySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    getMemory(userId)
      .then((res) => {
        if (!cancelled) setMemory(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load memory.");
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-foreground-subtle">Loading your settings...</div>;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Personal <span className="text-gradient-warm">Learning Settings</span>
        </h1>
        <p className="text-sm text-foreground-muted">
          Sign-in, onboarding, and adaptive memory all live here so the tutor can keep tuning itself to you.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="glass-panel-strong space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent-soft">
              <User2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Account</h2>
              <p className="text-sm text-foreground-muted">{authEmail ?? "Signed in account"}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-foreground-muted">
            <p><span className="text-foreground">Learner ID:</span> {authUserId ?? "Not available"}</p>
            <p><span className="text-foreground">EchoMind user ID:</span> {userId ?? "Not available"}</p>
            <p><span className="text-foreground">Onboarding complete:</span> {hasCompletedOnboarding(authUserId) ? "Yes" : "No"}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Settings2 className="h-4 w-4" />
              Update learning profile
            </Link>
            <Link
              href="/ask"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Back to simulations
            </Link>
          </div>
        </section>

        <section className="glass-panel-strong space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent-cool-soft">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Adaptive memory</h2>
              <p className="text-sm text-foreground-muted">
                This is the context EchoMind uses to choose visuals, pacing, and follow-up questions.
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {!memory && !error ? (
            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-6 text-sm text-foreground-subtle">
              EchoMind will populate this after your first session and feedback cycle.
            </div>
          ) : null}

          {memory ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-soft">Summary</div>
                <p className="text-sm text-foreground-muted">{memory.summary}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-soft">Learning profile</div>
                  <div className="space-y-2 text-sm text-foreground-muted">
                    <p>
                      <span className="text-foreground">Personalization:</span> {memory.personalization_summary}
                    </p>
                    <p>
                      <span className="text-foreground">Favorite visual style:</span>{" "}
                      {memory.favorite_visual_style.replaceAll("_", " ")}
                    </p>
                    <p>
                      <span className="text-foreground">Backboard memory:</span>{" "}
                      {memory.backboard_enabled ? "Connected" : "Local fallback only"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-soft">Presentation tuning</div>
                  <div className="space-y-2 text-sm text-foreground-muted">
                    {Object.entries(memory.presentation_preferences).map(([key, value]) => (
                      <p key={key}>
                        <span className="text-foreground">{key.replaceAll("_", " ")}:</span>{" "}
                        {value.replaceAll("_", " ")}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-soft">Concepts seen</div>
                  <div className="flex flex-wrap gap-2">
                    {memory.concepts_seen.length > 0 ? memory.concepts_seen.map((concept) => (
                      <span key={concept} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground-muted">
                        {concept}
                      </span>
                    )) : <span className="text-sm text-foreground-subtle">No concepts recorded yet.</span>}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-soft">Suggested next questions</div>
                  <div className="space-y-2">
                    {memory.suggested_questions.length > 0 ? memory.suggested_questions.map((question) => (
                      <p key={question} className="text-sm text-foreground-muted">{question}</p>
                    )) : <span className="text-sm text-foreground-subtle">No suggestions yet.</span>}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-soft">Learning styles</div>
                  <div className="flex flex-wrap gap-2">
                    {memory.learning_style.length > 0 ? memory.learning_style.map((style) => (
                      <span key={style} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground-muted">
                        {style.replaceAll("_", " ")}
                      </span>
                    )) : <span className="text-sm text-foreground-subtle">No style preference saved yet.</span>}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-soft">Feedback loop</div>
                  <div className="space-y-2 text-sm text-foreground-muted">
                    <p>
                      <span className="text-foreground">Feedback cycles:</span> {memory.feedback_count}
                    </p>
                    <p>
                      <span className="text-foreground">Latest rating:</span>{" "}
                      {memory.last_feedback_rating ? `${memory.last_feedback_rating}/5` : "No rating yet"}
                    </p>
                    <p>
                      <span className="text-foreground">Favorite topics:</span>{" "}
                      {memory.interests.length > 0 ? memory.interests.join(", ") : "Not set yet"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
