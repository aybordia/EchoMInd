"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { hasCompletedOnboarding, useEchoSession } from "@/lib/session";

type Mode = "signin" | "signup";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageShell />}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="text-sm text-foreground-subtle">Loading sign in...</div>
      </main>
    </div>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = useSession();
  const { authUserId } = useEchoSession();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/ask";

  useEffect(() => {
    if (!data?.user) return;
    const target = hasCompletedOnboarding(authUserId) ? callbackUrl : "/onboarding";
    router.replace(target);
  }, [authUserId, callbackUrl, data?.user, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(payload.error ?? "Unable to create account.");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: mode === "signup" ? "/onboarding" : callbackUrl,
      });

      if (result?.error) {
        setError("Incorrect email or password.");
        setLoading(false);
        return;
      }

      window.location.assign(result?.url ?? (mode === "signup" ? "/onboarding" : callbackUrl));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_0.95fr]">
          <section className="glass-panel-strong space-y-5 p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-foreground-muted">
              <Sparkles className="h-3.5 w-3.5 text-accent-soft" />
              Your EchoMind account
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
                Save every lesson, preference, and follow-up.
              </h1>
              <p className="max-w-xl text-sm text-foreground-muted sm:text-base">
                Create a simple account with your email and password. EchoMind will keep your learning settings, feedback loop, and memory tied to this account.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Persistent memory", "Every simulation and rating stays with your account."],
                ["Adaptive teaching", "EchoMind keeps learning your preferred pace and visuals."],
                ["Simple sign-in", "No Google step — just email, password, and go."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-1 text-sm font-semibold text-foreground">{title}</div>
                  <p className="text-sm text-foreground-muted">{description}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-foreground-subtle">
              After signing in, you’ll go straight into onboarding or back to your saved workspace.
            </p>
          </section>

          <section className="glass-panel-strong p-6 sm:p-8">
            <div className="mb-6 flex rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                  mode === "signup" ? "bg-accent text-background" : "text-foreground-muted"
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                  mode === "signin" ? "bg-accent text-background" : "text-foreground-muted"
                }`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-foreground-muted">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Mail className="h-4 w-4 text-foreground-subtle" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle"
                    placeholder="you@example.com"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-foreground-muted">Password</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <LockKeyhole className="h-4 w-4 text-foreground-subtle" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle"
                    placeholder={mode === "signup" ? "Choose a password (8+ characters)" : "Enter your password"}
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-foreground-muted">
              {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setError(null);
                }}
                className="text-accent-soft transition-colors hover:text-accent"
              >
                {mode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-foreground-subtle">
              <Link href="/" className="transition-colors hover:text-foreground-muted">
                Back to landing page
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
