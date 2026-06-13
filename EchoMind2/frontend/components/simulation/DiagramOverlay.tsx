import type { FallbackDiagramPayload } from "@/lib/types";

export function DiagramOverlay({ payload }: { payload: FallbackDiagramPayload }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-grid-faint p-6 text-center">
      <div className="animate-float-slow absolute -top-16 -left-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="animate-float-slower absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent-cool/10 blur-3xl" />

      <div className="glass-panel-strong relative z-10 max-w-md space-y-4 p-8">
        <h3 className="text-gradient-warm text-xl font-semibold">{payload.title}</h3>
        <p className="text-sm text-foreground-muted">{payload.message}</p>
        {payload.concepts.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {payload.concepts.map((concept) => (
              <span
                key={concept}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground-muted"
              >
                {concept}
              </span>
            ))}
          </div>
        )}
        {payload.takeaway && (
          <p className="text-sm font-medium text-accent-soft">{payload.takeaway}</p>
        )}
      </div>
    </div>
  );
}
