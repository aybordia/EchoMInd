"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Film, Mic, Orbit, Rocket, Sparkles, Wand2 } from "lucide-react";
import { AuthAction } from "@/components/AuthAction";
import { AskBar } from "@/components/AskBar";
import { LandingHeroScene } from "@/components/LandingHeroScene";
import { NavBar } from "@/components/NavBar";
import { SAMPLE_PROMPTS } from "@/lib/constants";
import { hasCompletedOnboarding, useEchoSession } from "@/lib/session";

const FEATURES = [
  {
    icon: Orbit,
    title: "Live 3D simulations",
    description:
      "Every answer renders as an interactive Three.js scene with lighting, camera motion, and teachable labels.",
  },
  {
    icon: Mic,
    title: "Voice-first tutoring",
    description:
      "Ask with your voice, hear the explanation back, and keep the lesson conversational after the simulation ends.",
  },
  {
    icon: Wand2,
    title: "Adaptive learning memory",
    description:
      "EchoMind remembers pace, visuals, and depth preferences so the next explanation fits the way you learn.",
  },
  {
    icon: Film,
    title: "Real-world digital twins",
    description:
      "Upload a clip from real life and EchoMind reconstructs it into a physics-aware 3D lesson.",
  },
];

const STEPS = [
  { step: "01", title: "Create your account", description: "Use email and password so your learning profile stays with you." },
  { step: "02", title: "Ask or upload", description: "Pose a WhatIf question or bring in a real-world video." },
  { step: "03", title: "Watch the simulation", description: "EchoMind renders a clean cinematic walkthrough." },
  { step: "04", title: "Teach EchoMind back", description: "Rate the lesson so future explanations get smarter." },
];

export default function LandingPage() {
  const router = useRouter();
  const { data } = useSession();
  const { authUserId } = useEchoSession();
  const [loading, setLoading] = useState(false);

  function handleAsk(question: string) {
    if (!data?.user) return;
    setLoading(true);
    const target = hasCompletedOnboarding(authUserId) ? "/ask" : "/onboarding";
    router.push(`${target}?q=${encodeURIComponent(question)}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="bg-grid-faint absolute inset-0 opacity-40" />
          <div className="animate-float-slow absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="animate-float-slower absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-cool/10 blur-3xl" />
          <div className="animate-float-slow absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent-violet/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.06fr_0.94fr]">
            <div className="space-y-8 text-center lg:text-left">
              <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-foreground-muted">
                <Sparkles className="h-3.5 w-3.5 text-accent-soft" />
                Personalized AI tutor with live simulations
              </span>

              <div className="space-y-4">
                <h1 className="animate-fade-in-up text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl">
                  Ask anything.
                  <br />
                  <span className="text-gradient-warm">See science happen.</span>
                </h1>

                <p className="animate-fade-in-up max-w-xl text-base text-foreground-muted sm:text-lg lg:max-w-2xl">
                  EchoMind turns your questions into cinematic simulations, voice-guided explanations, and a learning profile that gets smarter every session.
                </p>
              </div>

              {data?.user ? (
                <>
                  <div className="animate-fade-in-up max-w-xl lg:max-w-2xl">
                    <AskBar onSubmit={handleAsk} loading={loading} />
                  </div>
                  <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-2 lg:justify-start">
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
                  <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <Link
                      href={hasCompletedOnboarding(authUserId) ? "/ask" : "/onboarding"}
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <Rocket className="h-4 w-4" />
                      Enter EchoMind
                    </Link>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
                    >
                      <Wand2 className="h-4 w-4" />
                      Personal Learning Settings
                    </Link>
                  </div>
                </>
              ) : (
                <div className="animate-fade-in-up max-w-xl space-y-4 lg:max-w-2xl">
                  <div className="glass-panel-strong space-y-4 p-5 text-left">
                    <div className="text-sm font-medium text-foreground">Start with simple sign-in</div>
                    <p className="text-sm text-foreground-muted">
                      EchoMind uses your account to save onboarding, ratings, and learning style so the tutor keeps getting better for you.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <AuthAction callbackUrl="/onboarding" variant="primary" />
                      <Link
                        href="/video-twin"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
                      >
                        <Film className="h-4 w-4" />
                        Preview a video twin
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="animate-fade-in-up">
              <LandingHeroScene />
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-10">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">How the flow works</h2>
              <p className="text-sm text-foreground-muted">
                A clean entry, a clean lesson, and memory that improves the next one.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.step} className="glass-panel space-y-2 p-5">
                  <div className="font-mono text-xs text-accent-soft">{s.step}</div>
                  <div className="font-semibold text-foreground">{s.title}</div>
                  <p className="text-sm text-foreground-muted">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-10">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Built for <span className="text-gradient-cool">curious minds</span>
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="glass-panel-strong flex gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-accent-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">{feature.title}</div>
                      <p className="text-sm text-foreground-muted">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="glass-panel-strong glow-warm mx-auto max-w-3xl space-y-4 p-8 text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Ready to <span className="text-gradient-warm">make curiosity visible</span>?
            </h2>
            <p className="text-sm text-foreground-muted">
              Sign in with email and password to unlock your personalized learning profile and keep your sessions connected.
            </p>
            {data?.user ? (
              <Link
                href={hasCompletedOnboarding(authUserId) ? "/ask" : "/onboarding"}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                <Rocket className="h-4 w-4" />
                Continue into EchoMind
              </Link>
            ) : (
              <AuthAction callbackUrl="/onboarding" variant="primary" />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-foreground-subtle sm:px-6">
        EchoMind remembers how you learn, not just what you ask.
      </footer>
    </div>
  );
}
