"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Mic, Orbit, Rocket, Sparkles, Wand2 } from "lucide-react";
import { AskBar } from "@/components/AskBar";
import { NavBar } from "@/components/NavBar";
import { SAMPLE_PROMPTS } from "@/lib/constants";

const FEATURES = [
  {
    icon: Orbit,
    title: "Live 3D simulations",
    description:
      "Every answer renders as an interactive Three.js scene — planets, molecules, ramps, and more.",
  },
  {
    icon: Mic,
    title: "Talk or type",
    description:
      "Ask out loud with your voice or type your question — EchoMind listens and replies with narration.",
  },
  {
    icon: Wand2,
    title: "Adaptive memory",
    description:
      "EchoMind remembers what you've learned and adapts pace, visuals, and depth to how you learn best.",
  },
  {
    icon: Film,
    title: "Video digital twins",
    description:
      "Upload footage of a ramp-and-box setup and watch EchoMind rebuild it as a physics-accurate 3D twin.",
  },
];

const STEPS = [
  { step: "01", title: "Ask anything", description: "Type or speak a physics or chemistry question." },
  { step: "02", title: "Watch it happen", description: "EchoMind builds a live simulation in real time." },
  {
    step: "03",
    title: "Hear it explained",
    description: "A narrated walkthrough tuned to your learning style.",
  },
  {
    step: "04",
    title: "Keep exploring",
    description: "Ask follow-ups and rate explanations to teach EchoMind how you learn.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleAsk(question: string) {
    setLoading(true);
    router.push(`/ask?q=${encodeURIComponent(question)}`);
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

          <div className="relative mx-auto max-w-3xl space-y-8 text-center">
            <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-foreground-muted">
              <Sparkles className="h-3.5 w-3.5 text-accent-soft" />
              AI tutor with live 3D simulations
            </span>

            <h1 className="animate-fade-in-up text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl">
              Ask anything. <span className="text-gradient-warm">See it happen.</span>
            </h1>

            <p className="animate-fade-in-up mx-auto max-w-xl text-base text-foreground-muted sm:text-lg">
              EchoMind turns your physics and chemistry questions into live simulations, voice
              explanations, and lessons that adapt to how you learn.
            </p>

            <div className="animate-fade-in-up mx-auto max-w-xl">
              <AskBar onSubmit={handleAsk} loading={loading} />
            </div>

            <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-2">
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

            <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/onboarding"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
              >
                <Wand2 className="h-4 w-4" />
                Personalize EchoMind
              </Link>
              <Link
                href="/video-twin"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
              >
                <Film className="h-4 w-4" />
                Upload a video
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-10">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">How it works</h2>
              <p className="text-sm text-foreground-muted">
                From question to live 3D explanation in seconds.
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
              Ready to <span className="text-gradient-warm">see physics happen</span>?
            </h2>
            <p className="text-sm text-foreground-muted">No sign-up required — just ask.</p>
            <Link
              href="/ask"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Rocket className="h-4 w-4" />
              Start exploring
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-foreground-subtle sm:px-6">
        EchoMind — built for curious minds. No external API keys required.
      </footer>
    </div>
  );
}
