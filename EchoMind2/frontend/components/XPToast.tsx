"use client";

import { Sparkles } from "lucide-react";

export function XPToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-accent/25 bg-black/80 px-4 py-2 text-sm font-semibold text-accent-soft shadow-2xl backdrop-blur-xl">
      <span className="inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        {message}
      </span>
    </div>
  );
}
