"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Compass,
  LineChart,
  MessageSquare,
  Rocket,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { AuthAction } from "@/components/AuthAction";
import { AskBar } from "@/components/AskBar";
import { ConceptMap } from "@/components/ConceptMap";
import { NavBar } from "@/components/NavBar";
import { XPHeader } from "@/components/XPHeader";
import { getGameState, getMemory } from "@/lib/api";
import { getAuthUserId, useAuthSession } from "@/lib/auth-client";
import { SAMPLE_PROMPTS } from "@/lib/constants";
import { hasCompletedOnboarding, useEchoSession } from "@/lib/session";
import type { GameState, MemorySummary, XPEvent } from "@/lib/types";

function nextLevelTarget(level: number): number {
  return level * level * 100;
}

function formatDate(value?: string) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildXpSeries(events: XPEvent[]) {
  const recent = events.slice(-9);
  let total = 0;
  return recent.map((event, index) => {
    total += Number(event.amount ?? 0);
    return {
      label: event.type.replaceAll("_", " "),
      value: total,
      amount: Number(event.amount ?? 0),
      index,
    };
  });
}

function EmptyGraph() {
  return (
    <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] text-center text-sm text-foreground-muted">
      Run a simulation to start building your learning graph.
    </div>
  );
}

function XpTrend({ events }: { events: XPEvent[] }) {
  const series = buildXpSeries(events);
  if (!series.length) return <EmptyGraph />;
  const max = Math.max(...series.map((point) => point.value), 1);

  return (
    <div className="h-44 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <div className="flex h-full items-end gap-2">
        {series.map((point) => (
          <div key={`${point.label}-${point.index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-accent to-accent-cool shadow-[0_0_20px_rgba(255,157,77,0.18)]"
              style={{ height: `${Math.max(12, (point.value / max) * 132)}px` }}
              title={`${point.label}: +${point.amount} XP`}
            />
            <div className="max-w-full truncate text-[10px] capitalize text-foreground-subtle">
              {point.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MasteryBars({ state }: { state: GameState | null }) {
  const rows = Object.entries(state?.concept_mastery ?? {})
    .sort(([, a], [, b]) => b.progress - a.progress)
    .slice(0, 5);

  if (!rows.length) {
    return (
      <div className="space-y-3">
        {["Energy", "Gravity", "Scientific Prediction"].map((concept, index) => (
          <div key={concept}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-foreground">{concept}</span>
              <span className="text-foreground-subtle">0%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-white/10" style={{ width: `${8 + index * 4}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map(([concept, node]) => (
        <div key={concept}>
          <div className="mb-2 flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">{concept}</span>
            <span className="text-accent-soft">{node.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-cool via-accent to-accent-violet"
              style={{ width: `${node.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const router = useRouter();
  const { data, status } = useAuthSession();
  const { authUserId } = useEchoSession();
  const userId = getAuthUserId(data);
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [memory, setMemory] = useState<MemorySummary | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all([getGameState(userId), getMemory(userId)])
      .then(([nextGame, nextMemory]) => {
        if (!cancelled) {
          setGameState(nextGame);
          setMemory(nextMemory);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const attempts = Number(gameState?.prediction_stats?.attempts ?? 0);
  const correct = Number(gameState?.prediction_stats?.correct ?? 0);
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const xpTotal = gameState?.xp_total ?? 0;
  const level = gameState?.level ?? 1;
  const target = nextLevelTarget(level);
  const previous = Math.max(0, (level - 1) * (level - 1) * 100);
  const levelProgress = Math.min(100, Math.round(((xpTotal - previous) / Math.max(1, target - previous)) * 100));
  const recentScenarios = useMemo(() => (memory?.recent_scenarios ?? []).slice(-5).reverse(), [memory]);
  const recentTurns = useMemo(
    () => (memory?.conversation_history ?? []).filter((turn) => turn.role === "user").slice(-4).reverse(),
    [memory],
  );
  const suggested = memory?.suggested_questions?.length ? memory.suggested_questions : SAMPLE_PROMPTS;

  function handleAsk(question: string) {
    if (!data?.user) {
      router.push(`/auth?callbackUrl=${encodeURIComponent("/onboarding")}`);
      return;
    }
    setLoading(true);
    const target = hasCompletedOnboarding(authUserId) ? "/ask" : "/onboarding";
    router.push(`${target}?q=${encodeURIComponent(question)}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel-strong glow-warm p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-soft">
                  <Sparkles className="h-4 w-4" />
                  Learning Dashboard
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Your science progress, all in one place.
                </h1>
              </div>
              {userId ? <XPHeader userId={userId} initialState={gameState} /> : null}
            </div>
            <p className="max-w-3xl text-sm leading-6 text-foreground-muted sm:text-base">
              Ask a question, watch the 3D simulation, then see how your concepts, predictions, feedback, and chat history build into a clearer learning profile.
            </p>
            <div className="mt-6">
              <AskBar onSubmit={handleAsk} loading={loading || status === "loading"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggested.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleAsk(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground-muted transition-colors hover:border-accent/30 hover:text-foreground sm:text-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="glass-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-accent-soft" />
                  Next Level
                </div>
                <span className="text-xs text-foreground-subtle">Level {level}</span>
              </div>
              <div className="text-4xl font-semibold text-foreground">{levelProgress}%</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${levelProgress}%` }} />
              </div>
              <p className="mt-3 text-sm text-foreground-muted">{xpTotal} XP earned so far</p>
            </div>

            <div className="glass-panel p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent-soft" />
                Prediction Accuracy
              </div>
              <div className="text-4xl font-semibold text-foreground">{accuracy}%</div>
              <p className="mt-2 text-sm text-foreground-muted">{correct}/{attempts} predictions correct</p>
            </div>
          </div>
        </section>

        {!userId ? (
          <section className="glass-panel flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Sign in to save this dashboard</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Your chats, ratings, predictions, and concept mastery stay connected to your learning profile.
              </p>
            </div>
            <AuthAction callbackUrl="/onboarding" variant="primary" />
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-panel-strong p-5">
            <div className="mb-4 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-accent-soft" />
              <h2 className="text-xl font-semibold text-foreground">XP Growth</h2>
            </div>
            <XpTrend events={gameState?.xp_events ?? []} />
          </div>

          <div className="glass-panel-strong p-5">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent-soft" />
              <h2 className="text-xl font-semibold text-foreground">Strongest Concepts</h2>
            </div>
            <MasteryBars state={gameState} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="glass-panel-strong p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent-soft" />
                <h2 className="text-xl font-semibold text-foreground">Previous Chats</h2>
              </div>
              <Link href="/ask" className="text-sm font-medium text-accent-soft hover:text-accent">
                Open tutor
              </Link>
            </div>
            <div className="space-y-3">
              {recentScenarios.length ? recentScenarios.map((item) => (
                <div key={`${item.scenario_id}-${item.date}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">{item.title || "Simulation"}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">
                        {item.key_takeaway || "Simulation saved to your learning history."}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-foreground-subtle">{formatDate(item.date)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.concepts ?? []).slice(0, 4).map((concept) => (
                      <span key={concept} className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-foreground-muted">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )) : recentTurns.length ? recentTurns.map((turn) => (
                <div key={`${turn.job_id}-${turn.date}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="line-clamp-2 text-sm text-foreground">{turn.text}</p>
                    <span className="shrink-0 text-xs text-foreground-subtle">{formatDate(turn.date)}</span>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-foreground-muted">
                  Your recent simulations will appear here after the first lesson.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="glass-panel-strong p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent-soft" />
                <h2 className="text-xl font-semibold text-foreground">Concept Map</h2>
              </div>
              <ConceptMap mastery={gameState?.concept_mastery ?? {}} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass-panel p-4">
                <Trophy className="mb-3 h-5 w-5 text-accent-soft" />
                <div className="text-2xl font-semibold text-foreground">{gameState?.badges.length ?? 0}</div>
                <div className="text-xs text-foreground-muted">Badges</div>
              </div>
              <div className="glass-panel p-4">
                <Compass className="mb-3 h-5 w-5 text-accent-soft" />
                <div className="text-2xl font-semibold text-foreground">{gameState?.unlocked_tools.length ?? 0}</div>
                <div className="text-xs text-foreground-muted">Lab tools</div>
              </div>
              <div className="glass-panel p-4">
                <Rocket className="mb-3 h-5 w-5 text-accent-soft" />
                <div className="text-2xl font-semibold text-foreground">{memory?.feedback_count ?? 0}</div>
                <div className="text-xs text-foreground-muted">Reviews</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
