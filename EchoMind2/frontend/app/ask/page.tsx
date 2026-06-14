"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { AuthGate } from "@/components/AuthGate";
import { AskBar } from "@/components/AskBar";
import { FeedbackModal } from "@/components/FeedbackModal";
import { NavBar } from "@/components/NavBar";
import { PredictionCard } from "@/components/PredictionCard";
import { SimulationViewer } from "@/components/SimulationViewer";
import { XPHeader } from "@/components/XPHeader";
import { XPToast } from "@/components/XPToast";
import { JourneyOrb } from "@/components/simulation/JourneyOrb";
import type { JourneyWaypoint } from "@/components/simulation/JourneyOrb";
import {
  askAgent,
  followupAgent,
  getGameState,
  resolveAssetUrl,
  storeConversationTurn,
  submitPrediction,
} from "@/lib/api";
import { AGENT_STAGES, SAMPLE_PROMPTS } from "@/lib/constants";
import { hasCompletedOnboarding, useEchoSession } from "@/lib/session";
import type { AgentResult, GameState, PredictionSubmitResponse } from "@/lib/types";

type ViewState = "idle" | "running" | "result";

type ConversationEntry = {
  id: string;
  role: "assistant" | "user";
  text: string;
  pending?: boolean;
};

type LocalCommand =
  | { kind: "goto"; index: number; response: string }
  | { kind: "restart"; response: string }
  | { kind: "pause"; response: string }
  | { kind: "play"; response: string }
  | { kind: "end"; response: string }
  | null;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSimulationTitle(result: AgentResult | null): string {
  const simulation = result?.simulation as Record<string, unknown> | undefined;
  return typeof simulation?.title === "string" ? simulation.title : "EchoMind Simulation";
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function findWaypointIndex(question: string, waypoints: JourneyWaypoint[]): number | null {
  const normalized = question.toLowerCase();

  if (normalized.includes("beginning") || normalized.includes("start") || normalized.includes("first part")) {
    return 0;
  }

  const tokens = tokenize(question);
  let bestIndex: number | null = null;
  let bestScore = 0;

  waypoints.forEach((waypoint, index) => {
    const haystack = `${waypoint.label} ${waypoint.narration}`.toLowerCase();
    const score = tokens.reduce((count, token) => (haystack.includes(token) ? count + 1 : count), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore > 0 ? bestIndex : null;
}

function parseLocalCommand(input: string, waypoints: JourneyWaypoint[]): LocalCommand {
  const normalized = input.toLowerCase();

  if (normalized.includes("end session") || normalized.includes("finish session") || normalized.includes("we're done")) {
    return { kind: "end", response: "Okay. Let's wrap up this session and capture your feedback." };
  }

  if (normalized.includes("pause")) {
    return { kind: "pause", response: "Pausing the simulation here so we can focus on this moment." };
  }

  if (normalized.includes("continue") || normalized.includes("resume") || normalized.includes("play again")) {
    return { kind: "play", response: "Continuing from here." };
  }

  if (normalized.includes("restart") || normalized.includes("start over") || normalized.includes("replay from the start")) {
    return { kind: "restart", response: "Restarting from the beginning so we can walk through it again." };
  }

  const requestsNavigation =
    normalized.includes("go back") ||
    normalized.includes("take me to") ||
    normalized.includes("show me") ||
    normalized.includes("rewind") ||
    normalized.includes("back to") ||
    normalized.includes("go to");

  if (requestsNavigation) {
    const index = findWaypointIndex(input, waypoints);
    if (index !== null) {
      const label = waypoints[index]?.label ?? "that moment";
      return {
        kind: "goto",
        index,
        response: `Let's go back to ${label}. I’ve paused the simulation there so we can look closely.`,
      };
    }
  }

  return null;
}

export default function AskPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#05060a]">
      <NavBar />
      <AuthGate>
        <Suspense fallback={<AskPageShell />}>
          <AskPageContent />
        </Suspense>
      </AuthGate>
    </div>
  );
}

function AskPageShell() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-foreground-subtle">
      Loading EchoMind...
    </div>
  );
}

function AskPageContent() {
  const { sessionId, userId, authUserId } = useEchoSession();
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") ?? "";

  const [view, setView] = useState<ViewState>("idle");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [tutorBusy, setTutorBusy] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionSubmitResponse | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionRevealed, setPredictionRevealed] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const autoSubmitted = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (authUserId && !hasCompletedOnboarding(authUserId)) {
      window.location.replace("/onboarding");
    }
  }, [authUserId]);

  const waypoints: JourneyWaypoint[] = useMemo(() => {
    if (!result?.simulation) return [];
    const simulation = result.simulation as unknown as Record<string, unknown>;
    return (simulation.journey_waypoints as JourneyWaypoint[] | undefined) ?? [];
  }, [result]);

  const currentWaypoint = waypoints[currentWaypointIndex] ?? null;
  const stages = result?.stages ?? AGENT_STAGES;
  const simulationTitle = getSimulationTitle(result);
  const canNavigateWaypoints = waypoints.length > 0;
  const hasPrediction = Boolean(result?.prediction_prompt && result.prediction_options?.length);
  const awaitingPrediction = Boolean(result && hasPrediction && !predictionRevealed);
  const canAskFollowup = Boolean(result && introComplete && !awaitingPrediction);
  const conversationTurns = conversation.filter((entry) => entry.role === "user").length;
  const feedbackMetrics = useMemo(() => {
    if (!result) return undefined;

    return {
      simulation_title: simulationTitle,
      scenario_domain: result.scenario.domain,
      question,
      waypoints_available: waypoints.length,
      last_waypoint_label: currentWaypoint?.label ?? null,
      conversation_turns: conversationTurns,
      tutor_busy: tutorBusy,
      concepts_explained: result.teaching.concepts_explained,
      followup_count: result.teaching.followups.length,
      used_waypoint_audio: waypoints.some((waypoint) => Boolean(waypoint.audio_url)),
    };
  }, [
    conversationTurns,
    currentWaypoint?.label,
    question,
    result,
    simulationTitle,
    tutorBusy,
    waypoints,
  ]);

  useEffect(() => {
    if (!userId) return;
    getGameState(userId)
      .then(setGameState)
      .catch(() => undefined);
  }, [userId]);

  const addConversationEntry = useCallback((entry: ConversationEntry) => {
    setConversation((prev) => [...prev, entry]);
  }, []);

  const showXPToast = useCallback((message: string) => {
    setXpToast(message);
    window.setTimeout(() => setXpToast(null), 2600);
  }, []);

  const replacePendingEntry = useCallback((id: string, text: string) => {
    setConversation((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, text, pending: false } : entry))
    );
  }, []);

  const syncAudioCleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const startTimeline = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const tick = (now: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }
      const delta = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;
      setSimulationTime((prev) => prev + delta);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimeline = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastFrameTimeRef.current = null;
  }, []);

  const advanceWaypoint = useCallback(() => {
    setCurrentWaypointIndex((prev) => {
      if (prev >= waypoints.length - 1) {
        setIsPlaying(false);
        setSimulationPaused(true);
        stopTimeline();
        setIntroComplete(true);
        return prev;
      }
      return prev + 1;
    });
  }, [stopTimeline, waypoints.length]);

  const finishNarration = useCallback(() => {
    setIsSpeaking(false);
    setSimulationPaused(false);
    advanceTimerRef.current = setTimeout(() => {
      advanceWaypoint();
    }, 1200);
  }, [advanceWaypoint]);

  const fallbackSpeak = useCallback(
    (wp: JourneyWaypoint) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        finishNarration();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wp.narration);
      utterance.onend = finishNarration;
      window.speechSynthesis.speak(utterance);
    },
    [finishNarration]
  );

  const playWaypointAudio = useCallback(
    (wp: JourneyWaypoint) => {
      syncAudioCleanup();
      setIsSpeaking(true);
      setSimulationPaused(true);
      stopTimeline();
      setSimulationTime(wp.time);

      const audioUrl = wp.audio_url ? resolveAssetUrl(wp.audio_url) : null;
      if (!audioUrl) {
        fallbackSpeak(wp);
        return;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = finishNarration;
      audio.onerror = () => fallbackSpeak(wp);
      audio.play().catch(() => fallbackSpeak(wp));
    },
    [fallbackSpeak, finishNarration, stopTimeline, syncAudioCleanup]
  );

  useEffect(() => {
    if (!isPlaying || !currentWaypoint) return;
    const timer = window.setTimeout(() => {
      playWaypointAudio(currentWaypoint);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      syncAudioCleanup();
    };
  }, [currentWaypoint, isPlaying, playWaypointAudio, syncAudioCleanup]);

  useEffect(() => {
    if (view !== "result" || !result) return;

    if (isPlaying && !simulationPaused) {
      startTimeline();
      return () => {
        stopTimeline();
      };
    }

    stopTimeline();
    return () => {
      stopTimeline();
    };
  }, [isPlaying, result, simulationPaused, startTimeline, stopTimeline, view]);

  useEffect(() => {
    if (!result || conversationStarted) return;
    const timer = window.setTimeout(() => {
      const introText = result.teaching.adaptation_note
        ? `${result.teaching.key_takeaway} ${result.teaching.adaptation_note}`
        : result.teaching.key_takeaway;
      setConversation([
        {
          id: uid("assistant"),
          role: "assistant",
          text: introText,
        },
      ]);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [conversationStarted, result]);

  useEffect(() => {
    if (!result || canNavigateWaypoints) return;
    let audio: HTMLAudioElement | null = null;
    const timer = window.setTimeout(() => {
      syncAudioCleanup();
      setIntroComplete(false);
      setIsSpeaking(true);

      const summaryText = result.teaching.transcript || result.teaching.key_takeaway;
      const audioUrl = result.teaching.audio_url ? resolveAssetUrl(result.teaching.audio_url) : null;

      const finish = () => {
        setIsSpeaking(false);
        setIntroComplete(true);
      };

      if (!audioUrl) {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          finish();
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(summaryText);
        utterance.onend = finish;
        window.speechSynthesis.speak(utterance);
        return;
      }

      audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (audio) audio.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [canNavigateWaypoints, result, syncAudioCleanup]);

  const runRequest = useCallback(
    async (fetcher: () => Promise<AgentResult>, q: string) => {
      setQuestion(q);
      setError(null);
      setResult(null);
      setResultReady(false);
      setTimelineKey((key) => key + 1);
      setView("running");
      setCurrentWaypointIndex(0);
      setIsPlaying(false);
      setIsSpeaking(false);
      setSimulationPaused(false);
      setSimulationTime(0);
      setIntroComplete(false);
      setConversationStarted(false);
      setPredictionResult(null);
      setPredictionLoading(false);
      setPredictionRevealed(false);
      setShowFeedback(false);
      setTutorBusy(false);
      syncAudioCleanup();

      try {
        const res = await fetcher();
        setResult(res);
        if (res.game_state) {
          setGameState(res.game_state);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setResultReady(true);
      }
    },
    [syncAudioCleanup]
  );

  const handleAsk = useCallback(
    (q: string) => {
      if (!sessionId || !userId) return;
      runRequest(() => askAgent({ question: q, session_id: sessionId, user_id: userId }), q);
    },
    [runRequest, sessionId, userId]
  );

  useEffect(() => {
    if (!autoSubmitted.current && initialQuestion && sessionId && userId) {
      autoSubmitted.current = true;
      handleAsk(initialQuestion);
    }
  }, [handleAsk, initialQuestion, sessionId, userId]);

  function handleTimelineComplete() {
    setView(error ? "idle" : "result");
    if (!error && result?.prediction_prompt && result.prediction_options?.length && !predictionRevealed) {
      setSimulationPaused(true);
      setIntroComplete(false);
      setIsPlaying(false);
      return;
    }
    if (!error && waypoints.length > 0) {
      setCurrentWaypointIndex(0);
      setSimulationTime(waypoints[0]?.time ?? 0);
      setIsPlaying(true);
      setIntroComplete(false);
    } else if (!error) {
      setIntroComplete(false);
    }
  }

  function handleAskAgain() {
    syncAudioCleanup();
    setView("idle");
    setResult(null);
    setError(null);
    setQuestion("");
    setConversation([]);
    setCurrentWaypointIndex(0);
    setIsPlaying(false);
    setIsSpeaking(false);
    setSimulationPaused(false);
    setSimulationTime(0);
    setIntroComplete(false);
    setConversationStarted(false);
    setPredictionResult(null);
    setPredictionLoading(false);
    setPredictionRevealed(false);
    setTutorBusy(false);
    setShowFeedback(false);
  }

  function startNarratedReveal() {
    setPredictionRevealed(true);
    if (waypoints.length > 0) {
      setCurrentWaypointIndex(0);
      setSimulationTime(waypoints[0]?.time ?? 0);
      setSimulationPaused(false);
      setIsPlaying(true);
      setIntroComplete(false);
    } else {
      setIntroComplete(false);
    }
  }

  function handlePause() {
    setIsPlaying(false);
    setSimulationPaused(true);
    setIsSpeaking(false);
    stopTimeline();
    syncAudioCleanup();
  }

  function handlePlay() {
    if (!canNavigateWaypoints) return;
    setIsPlaying(true);
    setSimulationPaused(false);
  }

  function handleGoToWaypoint(index: number) {
    syncAudioCleanup();
    setCurrentWaypointIndex(index);
    setIsPlaying(false);
    setSimulationPaused(true);
    setIsSpeaking(false);
    setSimulationTime(waypoints[index]?.time ?? 0);
    stopTimeline();
  }

  async function handlePrediction(answer: string) {
    if (!result || !sessionId || !userId || predictionLoading) return;
    setPredictionLoading(true);
    try {
      const next = await submitPrediction({
        job_id: result.job_id,
        session_id: sessionId,
        user_id: userId,
        selected_answer: answer,
      });
      setPredictionResult(next);
      setGameState(next.game_state);
      showXPToast(next.correct ? "+50 XP for a correct prediction" : "+20 XP for predicting");
    } finally {
      setPredictionLoading(false);
    }
  }

  function handleStartConversation() {
    if (conversationStarted) return;
    setConversationStarted(true);
    addConversationEntry({
      id: uid("assistant"),
      role: "assistant",
      text: "Conversation mode is live. Ask a what-if, ask me to zoom into a moment, or tell me to change a variable and I will update the simulation.",
    });
  }

  async function handleTutorQuestion(input: string) {
    if (!sessionId || !userId || !result) return;
    if (!conversationStarted) {
      setConversationStarted(true);
    }

    addConversationEntry({ id: uid("user"), role: "user", text: input });
    void storeConversationTurn({
      job_id: result.job_id,
      session_id: sessionId,
      user_id: userId,
      role: "user",
      text: input,
      metadata: { simulation_title: simulationTitle, current_waypoint: currentWaypoint?.label ?? null },
    }).catch(() => undefined);

    const localCommand = parseLocalCommand(input, waypoints);
    if (localCommand) {
      if (localCommand.kind === "goto") {
        handleGoToWaypoint(localCommand.index);
      } else if (localCommand.kind === "restart") {
        setCurrentWaypointIndex(0);
        setSimulationPaused(false);
        setIsPlaying(true);
      } else if (localCommand.kind === "pause") {
        handlePause();
      } else if (localCommand.kind === "play") {
        handlePlay();
      } else if (localCommand.kind === "end") {
        setShowFeedback(true);
      }

      addConversationEntry({ id: uid("assistant"), role: "assistant", text: localCommand.response });
      void storeConversationTurn({
        job_id: result.job_id,
        session_id: sessionId,
        user_id: userId,
        role: "assistant",
        text: localCommand.response,
        metadata: { local_command: localCommand.kind },
      }).catch(() => undefined);
      return;
    }

    const pendingId = uid("assistant");
    setTutorBusy(true);
    addConversationEntry({
      id: pendingId,
      role: "assistant",
      text: "Let's take a look at that. Changing it right now.",
      pending: true,
    });

    try {
      const next = await followupAgent({
        job_id: result.job_id,
        followup: input,
        session_id: sessionId,
        user_id: userId,
      });

      syncAudioCleanup();
      setResult(next);
      if (next.game_state) {
        setGameState(next.game_state);
        showXPToast("+35 XP for a follow-up simulation");
      }
      setQuestion(input);
      setCurrentWaypointIndex(0);
      setIsSpeaking(false);
      setSimulationPaused(false);
      setSimulationTime(
        (((next.simulation as unknown as Record<string, unknown>).journey_waypoints as JourneyWaypoint[] | undefined)?.[0]?.time) ?? 0
      );
      setIsPlaying(
        (((next.simulation as unknown as Record<string, unknown>).journey_waypoints as JourneyWaypoint[] | undefined)?.length ?? 0) > 0
      );
      setIntroComplete(false);
      const responseText = `As you can see in the simulation, ${next.teaching.key_takeaway}`;
      replacePendingEntry(pendingId, responseText);
      void storeConversationTurn({
        job_id: next.job_id,
        session_id: sessionId,
        user_id: userId,
        role: "assistant",
        text: responseText,
        metadata: {
          updated_simulation: true,
          parent_job_id: result.job_id,
          simulation_title: getSimulationTitle(next),
        },
      }).catch(() => undefined);
    } catch (err) {
      replacePendingEntry(
        pendingId,
        err instanceof Error ? err.message : "I couldn't update the simulation just now."
      );
    } finally {
      setTutorBusy(false);
    }
  }

  function handleEndSession() {
    handlePause();
    setShowFeedback(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#05060a]">
      {view === "idle" && (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Ask <span className="text-gradient-warm">EchoMind</span>
            </h1>
            <p className="text-sm text-foreground-muted">
              Ask a physics or chemistry question and EchoMind will build a simulation you can control through conversation.
            </p>
          </div>
          <AskBar onSubmit={handleAsk} loading={false} initialValue={initialQuestion} />
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
          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
        </main>
      )}

      {view === "running" && (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
          <AskBar onSubmit={handleAsk} loading={true} initialValue={initialQuestion} />
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md space-y-4">
              <p className="text-center text-sm italic text-foreground-muted">&ldquo;{question}&rdquo;</p>
              <AgentTimeline
                key={timelineKey}
                stages={stages}
                waitingForResult={!resultReady}
                onComplete={handleTimelineComplete}
              />
            </div>
          </div>
        </main>
      )}

      {view === "result" && result && (
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
          {result.fallback_used ? (
            <div className="flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent-soft">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              EchoMind used the closest simulation model for this explanation.
            </div>
          ) : null}

          <div className="grid flex-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="glass-panel-strong relative min-h-[420px] overflow-hidden p-3 sm:min-h-[620px]">
              <div className="absolute left-6 top-6 z-10 rounded-xl border border-white/8 bg-black/40 px-3 py-1.5 backdrop-blur-2xl">
                <h3 className="text-sm font-semibold text-foreground/80">{simulationTitle}</h3>
              </div>
              {awaitingPrediction ? (
                <div className="absolute right-6 top-6 z-10 rounded-xl border border-accent/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-accent-soft backdrop-blur-2xl">
                  Prediction locked before reveal
                </div>
              ) : null}

              <div className="h-full overflow-hidden rounded-[1.25rem] border border-white/8">
                <SimulationViewer
                  simulation={result.simulation}
                  journeyActive={canNavigateWaypoints}
                  currentWaypoint={currentWaypoint}
                  simulationPaused={simulationPaused}
                  simulationTime={simulationTime}
                />
              </div>
            </section>

            <section className="glass-panel-strong flex min-h-[620px] flex-col gap-5 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-soft">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Tutor Control
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Talk to the simulation</h2>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Ask to replay a moment, pause the scene, or change a variable and EchoMind will update the lesson here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEndSession}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
                >
                  End session
                </button>
              </div>
              {userId ? <XPHeader userId={userId} initialState={gameState} /> : null}

              {awaitingPrediction && result.prediction_prompt && result.prediction_options ? (
                <PredictionCard
                  prompt={result.prediction_prompt}
                  options={result.prediction_options}
                  result={predictionResult}
                  loading={predictionLoading}
                  onSubmit={handlePrediction}
                  onContinue={startNarratedReveal}
                />
              ) : null}

              <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-white/8 bg-black/25 px-4 py-5">
                {canNavigateWaypoints ? (
                  <JourneyOrb
                    waypoints={waypoints}
                    currentWaypointIndex={currentWaypointIndex}
                    isPlaying={isPlaying}
                    isSpeaking={isSpeaking}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onNext={() => handleGoToWaypoint(Math.min(currentWaypointIndex + 1, waypoints.length - 1))}
                    onPrev={() => handleGoToWaypoint(Math.max(currentWaypointIndex - 1, 0))}
                    onGoToWaypoint={handleGoToWaypoint}
                  />
                ) : (
                  <div className="relative">
                    <div
                      className={`absolute -inset-5 rounded-full bg-gradient-to-br from-orange-500/20 via-sky-400/20 to-violet-500/20 blur-2xl ${
                        isSpeaking ? "animate-pulse" : ""
                      }`}
                    />
                    <div
                      className={`relative h-20 w-20 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffb46d,#ff7a3d_55%,#4f46e5)] shadow-[0_0_40px_rgba(255,122,61,0.35)] ${
                        isSpeaking ? "animate-[orb-speak_0.9s_ease-in-out_infinite]" : ""
                      }`}
                    />
                  </div>
                )}

                {tutorBusy ? (
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-soft" />
                    Updating the simulation...
                  </div>
                ) : null}

                {!introComplete ? (
                  <div className="flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-100">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                    EchoMind is walking through the simulation first.
                  </div>
                ) : null}

                {introComplete && !conversationStarted && !awaitingPrediction ? (
                  <div className="w-full rounded-2xl border border-accent/20 bg-accent/8 p-4 text-center">
                    <p className="text-sm text-foreground-muted">
                      The first walkthrough is complete. Type a follow-up below, or start the live conversation for guided what-if questions.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartConversation}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Start Conversation
                    </button>
                  </div>
                ) : null}

                {!currentWaypoint ? (
                  <div className="w-full rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-soft">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Tutor summary
                    </div>
                    <p className="text-sm leading-relaxed text-foreground-muted">
                      {result.teaching.key_takeaway}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex-1 space-y-4">
                <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
                  {conversation.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        entry.role === "assistant"
                          ? "border-white/8 bg-white/5 text-foreground-muted"
                          : "border-accent/20 bg-accent/8 text-foreground"
                      }`}
                    >
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-soft">
                        {entry.role === "assistant" ? "EchoMind" : "You"}
                      </div>
                      <div className="flex items-start gap-2">
                        {entry.pending ? <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-accent-soft" /> : null}
                        <p className="leading-relaxed">{entry.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <AskBar
                  onSubmit={handleTutorQuestion}
                  loading={tutorBusy}
                  disabled={!canAskFollowup}
                  placeholder={
                    canAskFollowup
                      ? 'Try: "Go back to the loop" or "What if this was two times bigger?"'
                      : "Follow-ups unlock after the first reveal"
                  }
                />

                {canAskFollowup && result.teaching.followups.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground-subtle">
                      Suggested follow-ups
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.teaching.followups.map((followup) => (
                        <button
                          key={followup}
                          type="button"
                          onClick={() => handleTutorQuestion(followup)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:border-accent/25 hover:text-foreground"
                        >
                          {followup}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {result.teaching.concepts_explained.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.teaching.concepts_explained.map((concept) => (
                      <span
                        key={concept}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground-muted"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={handleAskAgain}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition hover:border-white/20 hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Start a new question
                </button>
              </div>
            </section>
          </div>
        </main>
      )}

      {showFeedback && result && sessionId && userId ? (
        <FeedbackModal
          jobId={result.job_id}
          sessionId={sessionId}
          userId={userId}
          presentationMetrics={feedbackMetrics}
          onClose={() => setShowFeedback(false)}
        />
      ) : null}
      <XPToast message={xpToast} />
    </div>
  );
}
