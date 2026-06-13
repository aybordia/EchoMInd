"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { NavBar } from "@/components/NavBar";
import { VoicePicker } from "@/components/VoicePicker";
import { submitOnboarding } from "@/lib/api";
import { markOnboardingComplete, useEchoSession } from "@/lib/session";
import { LEARNING_STYLES } from "@/lib/types";

const STUDENT_LEVELS = [
  { id: "elementary", label: "Elementary", description: "Grades 3–5" },
  { id: "middle_school", label: "Middle school", description: "Grades 6–8" },
  { id: "high_school", label: "High school", description: "Grades 9–12" },
  { id: "college", label: "College", description: "Intro STEM courses" },
];

const TOPICS = [
  "Space & planets",
  "Forces & motion",
  "Energy & momentum",
  "Chemistry & molecules",
  "Electricity & magnetism",
  "Waves & sound",
];

const EXPLANATION_DEPTHS = [
  {
    id: "quick_then_deeper",
    label: "Quick takeaway first",
    description: "Give me the headline, then go deeper only if I ask.",
  },
  {
    id: "slower",
    label: "Slow & step-by-step",
    description: "Walk me through every step carefully.",
  },
];

const VOICE_PREFERENCES = [
  { id: "friendly_excited", label: "Friendly & excited", description: "Upbeat, energetic narration." },
  { id: "calm", label: "Calm & clear", description: "Steady, measured pace." },
  { id: "professor", label: "Professor", description: "Precise and academic." },
  { id: "funny", label: "Funny", description: "Playful, with the occasional joke." },
];

const STEP_META = [
  {
    title: "What level are you learning at?",
    subtitle: "EchoMind tunes its math and vocabulary to match.",
  },
  {
    title: "How do you like to learn?",
    subtitle: "Pick as many as you like — EchoMind blends these into every lesson.",
  },
  {
    title: "What are you curious about?",
    subtitle: "EchoMind will work these into examples and follow-up questions.",
  },
  {
    title: "How deep should explanations go?",
    subtitle: "You can always ask a follow-up for more detail.",
  },
  {
    title: "Pick a tutor voice",
    subtitle: "EchoMind narrates with this tone when audio is available.",
  },
];

const TOTAL_STEPS = STEP_META.length;

function OptionButton({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
        selected
          ? "border-accent/40 bg-accent/10"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <div className={`font-semibold ${selected ? "text-accent-soft" : "text-foreground"}`}>
        {title}
      </div>
      {description && <div className="mt-0.5 text-sm text-foreground-muted">{description}</div>}
    </button>
  );
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <AuthGate>
        <OnboardingContent />
      </AuthGate>
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const { sessionId, userId, authUserId } = useEchoSession();

  const [step, setStep] = useState(0);
  const [studentLevel, setStudentLevel] = useState("middle_school");
  const [learningStyle, setLearningStyle] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [explanationDepth, setExplanationDepth] = useState("quick_then_deeper");
  const [voicePreference, setVoicePreference] = useState("friendly_excited");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = step === TOTAL_STEPS - 1;
  const meta = STEP_META[step];

  async function handleFinish() {
    if (!sessionId || !userId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitOnboarding({
        session_id: sessionId,
        user_id: userId,
        student_level: studentLevel,
        learning_style: learningStyle,
        favorite_topics: topics,
        explanation_depth: explanationDepth,
        voice_preference: voicePreference,
        voice_id: voiceId,
        voice_label: voiceLabel,
      });
      markOnboardingComplete(authUserId);
      router.push("/ask");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function goNext() {
    if (isLast) {
      handleFinish();
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    }
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-soft">
              <Sparkles className="h-3.5 w-3.5" />
              Personalize EchoMind
            </span>
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="text-xs text-foreground-subtle transition-colors hover:text-foreground-muted disabled:opacity-40"
            >
              Skip for now
            </button>
          </div>
          <div className="flex items-center gap-2">
            {STEP_META.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-accent" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="glass-panel-strong flex-1 space-y-5 p-6 sm:p-8"
          >
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{meta.title}</h1>
              <p className="text-sm text-foreground-muted">{meta.subtitle}</p>
            </div>

            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {STUDENT_LEVELS.map((level) => (
                  <OptionButton
                    key={level.id}
                    selected={studentLevel === level.id}
                    onClick={() => setStudentLevel(level.id)}
                    title={level.label}
                    description={level.description}
                  />
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {LEARNING_STYLES.map((style) => (
                  <OptionButton
                    key={style.id}
                    selected={learningStyle.includes(style.id)}
                    onClick={() => setLearningStyle((prev) => toggleValue(prev, style.id))}
                    title={style.label}
                  />
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setTopics((prev) => toggleValue(prev, topic))}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      topics.includes(topic)
                        ? "border-accent/40 bg-accent/15 text-accent-soft"
                        : "border-white/10 bg-white/5 text-foreground-muted hover:border-white/20"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-3">
                {EXPLANATION_DEPTHS.map((depth) => (
                  <OptionButton
                    key={depth.id}
                    selected={explanationDepth === depth.id}
                    onClick={() => setExplanationDepth(depth.id)}
                    title={depth.label}
                    description={depth.description}
                  />
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {VOICE_PREFERENCES.map((voice) => (
                    <OptionButton
                      key={voice.id}
                      selected={voicePreference === voice.id}
                      onClick={() => setVoicePreference(voice.id)}
                      title={voice.label}
                      description={voice.description}
                    />
                  ))}
                </div>
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <p className="text-sm text-foreground-muted">
                    Pick the exact voice — preview any of them, including your own custom voices.
                  </p>
                  <VoicePicker
                    voiceId={voiceId}
                    onChange={(id, label) => {
                      setVoiceId(id);
                      setVoiceLabel(label);
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLast ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isLast ? "Start exploring" : "Next"}
          </button>
        </div>
      </main>
  );
}
