"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";

export function AuthGate({
  children,
  fallbackHref = "/",
}: {
  children: React.ReactNode;
  fallbackHref?: string;
}) {
  const router = useRouter();
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      startTransition(() => {
        router.replace(fallbackHref);
      });
    }
  }, [fallbackHref, router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-foreground-subtle">
        Loading your workspace...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
