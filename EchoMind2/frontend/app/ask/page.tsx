"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { AskBar } from "@/components/AskBar";
import { FeedbackModal } from "@/components/FeedbackModal";
import { NavBar } from "@/components/NavBar";
import { SimulationViewer } from "@/components/SimulationViewer";
import { TutorPanel } from "@/components/TutorPanel";
import { VoicePicker } from "@/components/VoicePicker";
import { askAgent, followupAgent } from "@/lib/api";
import { AGENT_STAGES, SAMPLE_PROMPTS } from "@/lib/constants";
import { useEchoSession } from "@/lib/session";
import type { AgentResult } from "@/lib/types";

type ViewState = "idle" | "running" | "result";

export default function AskPage() {
  return (
    <Suspense fallback={<AskPageShell />}>
      <AskPageContent />
    </Suspense>
  );
}

function AskPageShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <div className="flex flex-1 items-center justify-center text-sm text-foreground-subtle">
        Loading EchoMind…
      </div>
    </div>
  );
}

function AskPageContent() {
  const { sessionId, userId } = useEchoSession();
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") ?? "";

  const [view, setView] = useState<ViewState>("idle");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);

  const autoSubmitted = useRef(false);

  const runRequest = useCallback(async (fetcher: () => Promise<AgentResult>, q: string) => {
    setQuestion(q);
    setError(null);
    setResult(null);
    setResultReady(false);
    setShowFeedback(false);
    setTimelineKey((k) => k + 1);
    setView("running");

    try {
      const res = await fetcher();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResultReady(true);
    }
  }, []);

  const handleAsk = useCallback(
    (q: string) => {
      if (!sessionId || !userId) return;
      runRequest(
        () =>
          askAgent({ question: q, session_id: sessionId, user_id: userId, voice_id: voiceId }),
        q
      );
    },
    [sessionId, userId, runRequest, voiceId]
  );

  const handleFollowup = useCallback(
    (q: string) => {
      if (!sessionId || !userId || !result) return;
      runRequest(
        () =>
          followupAgent({
            job_id: result.job_id,
            followup: q,
            session_id: sessionId,
            user_id: userId,
            voice_id: voiceId,
          }),
        q
      );
    },
    [sessionId, userId, result, runRequest, voiceId]
  );

  useEffect(() => {
    if (!autoSubmitted.current && initialQuestion && sessionId && userId) {
      autoSubmitted.current = true;
      handleAsk(initialQuestion);
    }
  }, [initialQuestion, sessionId, userId, handleAsk]);

  const stages = result?.stages ?? AGENT_STAGES;

  function handleTimelineComplete() {
    setView(error ? "idle" : "result");
  }

  function handleAskAgain() {
    setView("idle");
    setResult(null);
    setError(null);
    setQuestion("");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Ask <span className="text-gradient-warm">EchoMind</span>
          </h1>
          <p className="text-sm text-foreground-muted">
            Ask a physics or chemistry question out loud or by typing — EchoMind builds a live
            simulation and explains it your way.
          </p>
        </div>

        <AskBar onSubmit={handleAsk} loading={view === "running"} initialValue={initialQuestion} />

        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-subtle">
          <span>Tutor voice:</span>
          <VoicePicker voiceId={voiceId} onChange={(id) => setVoiceId(id)} />
        </div>

        {view === "idle" && (
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleAsk(prompt)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-accent/30 hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {view === "running" && (
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md space-y-4">
              <p className="text-center text-sm italic text-foreground-muted">
                &ldquo;{question}&rdquo;
              </p>
              <AgentTimeline
                key={timelineKey}
                stages={stages}
                waitingForResult={!resultReady}
                onComplete={handleTimelineComplete}
              />
            </div>
          </div>
        )}

        {view === "result" && result && (
          <>
            {result.fallback_used && (
              <div className="flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent-soft">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                EchoMind didn&apos;t find an exact match, so it used the closest simulation it
                knows.
              </div>
            )}

            <div className="grid flex-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="relative h-[60vh] min-h-[420px] lg:h-[70vh]">
                <SimulationViewer simulation={result.simulation} />
              </div>
              <TutorPanel
                teaching={result.teaching}
                simulation={result.simulation}
                onFollowup={handleFollowup}
                onGiveFeedback={() => setShowFeedback(true)}
              />
            </div>

            <button
              type="button"
              onClick={handleAskAgain}
              className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Ask something else
            </button>
          </>
        )}

        {error && view === "idle" && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </main>

      {showFeedback && result && sessionId && userId && (
        <FeedbackModal
          jobId={result.job_id}
          sessionId={sessionId}
          userId={userId}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}
