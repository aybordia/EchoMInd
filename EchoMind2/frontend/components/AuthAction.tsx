"use client";

import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut, Sparkles } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function AuthAction({
  callbackUrl = "/ask",
  variant = "primary",
}: {
  callbackUrl?: string;
  variant?: "primary" | "secondary";
}) {
  const { data, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading
      </button>
    );
  }

  if (data?.user) {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    );
  }

  const className =
    variant === "primary"
      ? "inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground";

  return (
    <button type="button" onClick={() => router.push(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`)} className={className}>
      {variant === "primary" ? <Sparkles className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
      Sign up or sign in
    </button>
  );
}
