/**
 * Local session/user identity management.
 * EchoMind has no auth — a session/user id pair is created once via
 * `POST /api/session` and persisted in localStorage so adaptive memory
 * can follow the same user across visits.
 */
"use client";

import { useEffect, useState } from "react";
import { createSession } from "./api";

const SESSION_STORAGE_KEY = "echomind_session";
const ONBOARDING_STORAGE_KEY = "echomind_onboarding_complete";

interface StoredSession {
  sessionId: string;
  userId: string;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.sessionId === "string" && typeof parsed.userId === "string") {
      return { sessionId: parsed.sessionId, userId: parsed.userId };
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function writeStoredSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export interface EchoSession {
  sessionId: string | null;
  userId: string | null;
  loading: boolean;
}

interface ResolvedSession {
  session: StoredSession;
  isNew: boolean;
}

/** Reads the stored session, or creates a fresh one (falling back to a local id if the API fails). */
async function resolveSession(): Promise<ResolvedSession> {
  const existing = readStoredSession();
  if (existing) return { session: existing, isNew: false };

  try {
    const res = await createSession();
    return { session: { sessionId: res.session_id, userId: res.user_id }, isNew: true };
  } catch {
    return {
      session: { sessionId: randomId("session_local"), userId: randomId("user_local") },
      isNew: true,
    };
  }
}

/** Returns the persistent session/user id pair, creating one on first run. */
export function useEchoSession(): EchoSession {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    resolveSession().then(({ session: next, isNew }) => {
      if (cancelled) return;
      if (isNew) writeStoredSession(next);
      setSession(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    sessionId: session?.sessionId ?? null,
    userId: session?.userId ?? null,
    loading,
  };
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}
