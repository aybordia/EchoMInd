"use client";

import { useEffect, useState } from "react";

export interface EchoAuthUser {
  id?: string | null;
  email?: string | null;
  name?: string | null;
}

export interface EchoAuthSession {
  user?: EchoAuthUser | null;
  expires?: string;
}

export type EchoAuthStatus = "loading" | "authenticated" | "unauthenticated";

async function fetchAuthSession(): Promise<EchoAuthSession | null> {
  const res = await fetch("/api/auth/session", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!res.ok) return null;
  return (await res.json()) as EchoAuthSession | null;
}

export function getAuthUserId(session: EchoAuthSession | null): string | null {
  return session?.user?.id ?? session?.user?.email ?? null;
}

export function useAuthSession(): {
  data: EchoAuthSession | null;
  status: EchoAuthStatus;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<EchoAuthSession | null>(null);
  const [status, setStatus] = useState<EchoAuthStatus>("loading");

  async function refresh() {
    setStatus("loading");
    try {
      const next = await fetchAuthSession();
      setData(next);
      setStatus(next?.user ? "authenticated" : "unauthenticated");
    } catch {
      setData(null);
      setStatus("unauthenticated");
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchAuthSession()
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setStatus(next?.user ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, status, refresh };
}
