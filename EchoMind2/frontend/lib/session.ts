/**
 * EchoMind session management layered on top of account auth.
 * The signed-in user identity is the stable learner identity; the backend
 * session id remains a lightweight per-user runtime key for simulation requests.
 */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createSession } from "./api";

const SESSION_STORAGE_PREFIX = "echomind_session";
const ONBOARDING_STORAGE_PREFIX = "echomind_onboarding_complete";

interface StoredSession {
  sessionId: string;
  userId: string;
}

function sessionStorageKey(authUserId: string): string {
  return `${SESSION_STORAGE_PREFIX}:${authUserId}`;
}

function onboardingStorageKey(authUserId: string): string {
  return `${ONBOARDING_STORAGE_PREFIX}:${authUserId}`;
}

function readStoredSession(authUserId: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(sessionStorageKey(authUserId));
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

function writeStoredSession(authUserId: string, session: StoredSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sessionStorageKey(authUserId), JSON.stringify(session));
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
  authenticated: boolean;
  authUserId: string | null;
  authEmail: string | null;
}

interface ResolvedSession {
  session: StoredSession;
  isNew: boolean;
}

async function resolveSession(authUserId: string): Promise<ResolvedSession> {
  const existing = readStoredSession(authUserId);
  if (existing) return { session: existing, isNew: false };

  try {
    const res = await createSession();
    return { session: { sessionId: res.session_id, userId: authUserId }, isNew: true };
  } catch {
    return {
      session: { sessionId: randomId("session_local"), userId: authUserId },
      isNew: true,
    };
  }
}

export function useEchoSession(): EchoSession {
  const { data, status } = useSession();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  const authUserId = data?.user?.id ?? null;
  const authEmail = data?.user?.email ?? null;

  useEffect(() => {
    let cancelled = false;

    if (status === "loading") {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (status === "unauthenticated" || !authUserId) {
      setSession(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    resolveSession(authUserId).then(({ session: next, isNew }) => {
      if (cancelled) return;
      if (isNew) writeStoredSession(authUserId, next);
      setSession(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authUserId, status]);

  return {
    sessionId: session?.sessionId ?? null,
    userId: session?.userId ?? null,
    loading,
    authenticated: status === "authenticated",
    authUserId,
    authEmail,
  };
}

export function hasCompletedOnboarding(authUserId: string | null): boolean {
  if (typeof window === "undefined" || !authUserId) return false;
  return window.localStorage.getItem(onboardingStorageKey(authUserId)) === "true";
}

export function markOnboardingComplete(authUserId: string | null): void {
  if (typeof window === "undefined" || !authUserId) return;
  window.localStorage.setItem(onboardingStorageKey(authUserId), "true");
}
